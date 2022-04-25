interface ResponseWithSocket extends Response {
    webSocket: WebSocket
}

interface Window {
    game: Phaser.Game | undefined
}

declare module '*.png' {
    const src: string;
    export default src;
}
