export const keepAlive = ({
                       provider,
                       onDisconnect,
                       expectedPongBack = 15000,
                       checkInterval = 7500,
                   }) => {
    let pingTimeout = null;
    let keepAliveInterval = null;

    provider._websocket.on('open', () => {
        keepAliveInterval = setInterval(() => {
            provider._websocket.ping();

            // Use `WebSocket#terminate()`, which immediately destroys the connection,
            // instead of `WebSocket#close()`, which waits for the close timer.
            // Delay should be equal to the interval at which your server
            // sends out pings plus a conservative assumption of the latency.
            pingTimeout = setTimeout(() => {
                provider._websocket.terminate();
            }, expectedPongBack);
        }, checkInterval);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider._websocket.on('close', (err) => {
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        if (pingTimeout) clearTimeout(pingTimeout);
        onDisconnect(err);
    });

    provider._websocket.on('pong', () => {
        if (pingTimeout) clearInterval(pingTimeout);
    });
};