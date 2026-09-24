import React from 'react';
import { View, Pressable } from 'react-native';
import { NeoText } from './ui/NeoText';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level render-error boundary.
 *
 * Without one, any throw inside the component tree (badly shaped server
 * response, missing native module on a platform, etc.) unmounts the whole app
 * and leaves a blank screen with no way back. This catches it, reports it, and
 * offers a retry.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View className="flex-1 bg-neo-bg items-center justify-center px-6">
        <View className="w-full max-w-md bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <NeoText variant="h3" className="font-black uppercase mb-2">
            Something broke
          </NeoText>
          <NeoText variant="caption" className="font-medium opacity-70 mb-4">
            {error.message || 'An unexpected error occurred.'}
          </NeoText>
          <Pressable
            onPress={this.handleReset}
            className="bg-neo-secondary border-2 border-black px-4 py-3 items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:opacity-75"
          >
            <NeoText variant="caption" className="font-black uppercase tracking-widest">
              Try again
            </NeoText>
          </Pressable>
        </View>
      </View>
    );
  }
}
