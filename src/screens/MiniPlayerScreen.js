import React, {Component} from 'react';
import {
  Image,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform, StyleSheet
} from 'react-native';
import Button from 'react-native-button';
import {Actions} from 'react-native-router-flux';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import ActionCreators from '../actions';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Video from 'react-native-video';
import * as Utils from '../helpers/utils';
import {ForwardButton, BackwardButton, PlayButton, ShuffleButton, VolumeButton, DownloadButton, SongSlider} from '../components/PlayerButtons';
import MusicControl from 'react-native-music-control';
import * as Progress from 'react-native-progress';
import {Ionicons} from '@expo/vector-icons';
import _ from 'underscore';

let {height, width} = Dimensions.get('window');

class PlayerScreen extends Component {
  constructor(props){
    super(props);
    this.state = {
      playing: false,
      muted: false,
      originalPlaylist: null
    };
  }

  setPlayingSong(duration) {
    let song = this.props.songs[this.props.songIndex];
    MusicControl.setNowPlaying({
      title: song.title,
      artwork: song.thumb,
      artist: song.artist,
      duration
    });
  }

  togglePlay(status) {
    this.props.setPlaying(status);
    MusicControl.updatePlayback({
      state: status? MusicControl.STATE_PLAYING: MusicControl.STATE_PAUSED,
      elapsedTime: this.state.currentTime
    })
  }

  toggleVolume(){
    this.setState({ muted: !this.state.muted });
  }

  goBackward(){
    if(this.state.currentTime < 3 && this.props.songIndex !== 0 ) {
      this.props.setPlayingSong(this.props.songIndex - 1);
    } else {
      this.refs.audio.seek(0);
      MusicControl.updatePlayback({
        state: MusicControl.STATE_PLAYING,
        elapsedTime: 0
      });
    }
  }

  goForward() {
    this.refs.audio.seek(0);
    this.setTime({currentTime: 0});

    if(this.props.shuffle && this.props.songIndex + 1 == this.props.songs.length) {
       return this.toggleShuffle(true, true);
    }
    if (this.props.songs.length === 1) {
      return;
    }
    if (this.props.songIndex + 1 != this.props.songs.length) {
      let index = this.props.songIndex + 1;
      let song = this.props.songs[index];
      let changePath = (!song.downloaded && !song.pathChanged);
      return this.props.setPlayingSong(index, changePath? this.props.songs: null, changePath);
    }
    let song = this.props.songs[0];
    let changePath = (!song.downloaded && !song.pathChanged);
    this.props.setPlayingSong(0, changePath? this.props.songs: null, changePath);
    this.props.setPlaying(false);
    MusicControl.updatePlayback({
      title: song.title,
      artwork: song.thumb,
      artist: song.artist,
      state: MusicControl.STATE_PAUSED,
      elapsedTime: 0
    });
  }

  setTime(params) {
      this.props.setSongProgress(params.currentTime);
      this.setState({currentTime: params.currentTime});
  }

  onLoad(params) {
    this.props.setSongDuration(params.duration);
    this.setPlayingSong(params.duration);
  }

  onSlidingComplete(time){
    this.refs.audio.seek(time);
  }

  onEnd() {
    this.props.setPlaying(false);
    this.goForward();
  }

  openPlayer() {
    this.togglePlay(true);
    Actions.player({
      togglePlay: this.togglePlay.bind(this),
      goBackward: this.goBackward.bind(this),
      goForward: this.goForward.bind(this),
      toggleShuffle: this.toggleShuffle.bind(this)
    });
  }

  renderVideoPlayer() {
    if (this.props.songs[this.props.songIndex]) {
        return (
            <Video
              source={{uri: this.props.songs[this.props.songIndex].path}}
              style={Actions.currentScene === "player" ? styles.songVideo : null}
              volume={this.props.volume}
              muted={false}
              ref="audio"
              paused={!this.props.playing}
              playInBackground={true}
              playWhenInactive={true}
              ignoreSilentSwitch={"ignore"}
              onLoad={this.onLoad.bind(this)}
              onProgress={this.setTime.bind(this)}
              onEnd={this.onEnd.bind(this)}
              resizeMode="contain"
              repeat={false}>
            </Video>);
    }
      return null;
  }

  toggleShuffle(status, dontChangeIndex) {
    this.props.setShuffle(status);
    if (this.props.songs.length === 1) {
      return this.props.setPlayingSong(0);
    }
    if (!status) {
      let playingSong = this.props.songs[this.props.songIndex];
      let originalIndex = _.findIndex(this.state.originalPlaylist, {id: playingSong.id});
      this.props.setPlayingSong(originalIndex, this.state.originalSongs);
      this.setState({originalPlaylist: null});
    }
    this.setState({originalPlaylist: this.state.originalPlaylist || [...this.props.songs]});
    let shuffledSongs = _.shuffle(this.props.songs);
    if (dontChangeIndex) {
      let songId = this.props.songs[this.props.songIndex].id;
      if (shuffledSongs[0].id === songId) {
          shuffledSongs.push(shuffledSongs.shift());
      }

      return this.props.setPlayingSong(0, shuffledSongs);
    }

    this.transferSongs(0, shuffledSongs);
    this.props.setPlayingSong(0, shuffledSongs);
  }


  transferSongs(indexToChange, shuffledSongs) {
    let newIndex = _.findIndex(shuffledSongs, {id: this.props.songs[this.props.songIndex].id});
    let songToChangeIndex = shuffledSongs[indexToChange];
    shuffledSongs[newIndex] = songToChangeIndex;
    shuffledSongs[indexToChange] = this.props.songs[this.props.songIndex];
  }

  async componentDidMount() {
    await this.props.getSongs();
    MusicControl.enableControl('play', true);
    MusicControl.enableControl('pause', true);
    MusicControl.enableControl('nextTrack', true);
    MusicControl.enableControl('previousTrack', true);
    MusicControl.enableControl('seekForward', false);
    MusicControl.enableControl('seekBackward', false);
    MusicControl.enableBackgroundMode(true);
    MusicControl.on('play', ()=> {
      this.togglePlay(true);
    });
    MusicControl.on('pause', ()=> {
      this.togglePlay(false);
    });
    MusicControl.on('nextTrack', this.goForward.bind(this));
    MusicControl.on('previousTrack', this.goBackward.bind(this));
  }

  songImage = require("../assets/images/icon.png");

  render() {
      let song = this.props.songs[this.props.songIndex];
      if (!song) {
        return null;
      }
      let text = `${song.artist} - ${song.title}`;
      return (
        <TouchableOpacity
            style={
              [styles.playerOverlay,
              {width: Actions.currentScene === 'player' ? 0 : width}]
            }
            onPress={Actions.currentScene !== 'player' ? this.openPlayer.bind(this) : null}>
              {this.renderVideoPlayer()}
              <View
                  style={styles.minimizedPlayer}>
                    {Actions.currentScene === 'player' ? null:
                    <Image
                      style={styles.songImageSmall}
                      source={{uri: (Platform.OS === 'android' ? "file://" : "") + song.thumb}}>
                    </Image>}
                    <Text>
                      {text.slice(0, 30)}...
                    </Text>
                    <FontAwesome
                        onPress={() => this.togglePlay(!this.props.playing)}
                        name={this.props.playing ? "pause" : "play"}
                        size={20}>
                    </FontAwesome>
                    {renderForwardButton.call(this)}
              </View>
        </TouchableOpacity>
      );
  }
}

function renderForwardButton() {
  if (this.props.songIndex + 1 === this.props.songs.length) {
       return <FontAwesome
              name="forward"
              size={20}
              color="#333">
          </FontAwesome>;
  }
  return <FontAwesome
        onPress={this.goForward.bind(this)}
        name="forward"
        size={20}>
    </FontAwesome>;
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators(ActionCreators, dispatch);
}

function mapStateToProps(store) {
    return {
      searchResults: store.searchResults,
      progreses: store.progreses,
      scene: store.scene,
      duration: store.songDuration,
      playing: store.playing,
      songs: store.playlist,
      songIndex: store.songIndex,
      shuffle: store.shuffle,
      volume: store.volume
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(PlayerScreen);

const styles = StyleSheet.create({
  playerOverlay: {
    position: 'absolute',
    zIndex: 200,
    bottom: 50,
    width,
    height: 50,
    backgroundColor: '#eaeff7',
    marginBottom: 30
  },
  minimizedPlayer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10
  },
  songImageSmall: {
    width: 45,
    height: 45
  },
  songVideo: {
    position: 'relative',
    left: 15,
    bottom: height - width / 2 ,
    width: width - 30,
    height: 300
  },
});
