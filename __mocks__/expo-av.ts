// Store the callback to be called manually in tests
let mockOnPlaybackStatusUpdate: ((status: any) => void) | null = null;

// Global function to trigger playback finish in tests
(global as any).mockPlaybackFinish = (status = { isLoaded: true, didJustFinish: true }) => {
    if (mockOnPlaybackStatusUpdate) {
        mockOnPlaybackStatusUpdate(status);
    }
};

export const Audio = {
    Sound: {
        createAsync: jest.fn().mockImplementation((source, config, onPlaybackStatusUpdate) => {
            // Store the callback but don't call it immediately
            mockOnPlaybackStatusUpdate = onPlaybackStatusUpdate;
            
            // Return a resolved promise since useSound expects a promise
            return Promise.resolve({
                sound: {
                    unloadAsync: jest.fn().mockResolvedValue(undefined),
                    setOnPlaybackStatusUpdate: jest.fn(),
                },
            });
        })
    },
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
};

