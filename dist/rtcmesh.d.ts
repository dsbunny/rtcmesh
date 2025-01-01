export interface RTCMeshSettings {
    label: string;
    id: string;
    iceServers: RTCIceServer[];
    peers: string[];
    enableLoopback: boolean;
}
export declare class RTCMesh extends EventTarget {
    #private;
    label: string;
    id: string;
    configuration: RTCConfiguration;
    peers: string[];
    enable_loopback: boolean;
    channels: Map<string, RTCDataChannel>;
    user_channels: Map<string, RTCDataChannel>;
    connections: Map<string, RTCPeerConnection>;
    loopback1?: RTCPeerConnection;
    loopback2?: RTCPeerConnection;
    loopback_send_channel?: RTCDataChannel;
    loopback_receive_channel?: RTCDataChannel;
    constructor(settings: RTCMeshSettings);
    user_channel(peer: string): RTCDataChannel | undefined;
    readyState(peer: string): RTCDataChannelState | "new";
    close(id: string): Promise<void>;
    addIceCandidate(id: string, candidate: RTCIceCandidateInit | null): void;
    createOffer(id: string): void;
    addAnswer(id: string, sdp: string): void;
    broadcast(data: string): void;
    broadcast(data: Blob): void;
    broadcast(data: ArrayBuffer): void;
    broadcast(data: ArrayBufferView): void;
    createAnswer(id: string, sdp: string): void;
}
