import React, { Component } from 'react';
import {AppRegistry, Platform, StatusBar, StyleSheet, View} from 'react-native';
import { Scene, Router } from 'react-native-router-flux';
import { createStore, applyMiddleware } from 'redux';
import { connect, Provider } from 'react-redux';
import reducer from './src/reducers';
import AppNavigator from './src/navigation/AppNavigator';
import {AppLoading, Asset, Font, Icon} from "expo";

const RouterWithRedux = connect()(Router);
const store = createStore(reducer);

// const YoutubePlayer = () => <AppNavigator />;

// AppRegistry.registerComponent('YoutubePlayer', () => YoutubePlayer);

export default class App extends React.Component {
  state = {
    isLoadingComplete: false,
  };

  render() {
    if (!this.state.isLoadingComplete && !this.props.skipLoadingScreen) {
      return (
          <AppLoading
              startAsync={this._loadResourcesAsync}
              onError={this._handleLoadingError}
              onFinish={this._handleFinishLoading}
          />
      );
    } else {
      return (
          <View style={styles.container}>
            {Platform.OS === 'ios' && <StatusBar barStyle="default" />}
            <AppNavigator />
          </View>
      );
    }
  }

  _loadResourcesAsync = async () => {
    return Promise.all([
      Asset.loadAsync([
        require('./src/assets/images/robot-dev.png'),
        require('./src/assets/images/robot-prod.png'),
      ]),
      Font.loadAsync({
        // This is the font that we are using for our tab bar
        ...Icon.Ionicons.font,
        // We include SpaceMono because we use it in SearchScreen.js. Feel free
        // to remove this if you are not using it in your app
        'space-mono': require('./src/assets/fonts/SpaceMono-Regular.ttf'),
      }),
    ]);
  };

  _handleLoadingError = error => {
    // In this case, you might want to report the error to your error
    // reporting service, for example Sentry
    console.warn(error);
  };

  _handleFinishLoading = () => {
    this.setState({ isLoadingComplete: true });
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
});