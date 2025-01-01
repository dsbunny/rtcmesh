// vim: tabstop=8 softtabstop=0 noexpandtab shiftwidth=8 nosmarttab
;
export class RTCMesh extends EventTarget {
    label;
    id;
    configuration;
    peers;
    enable_loopback;
    channels;
    user_channels;
    connections;
    loopback1;
    loopback2;
    loopback_send_channel;
    loopback_receive_channel;
    constructor(settings) {
        super();
        this.label = settings.label;
        this.id = settings.id;
        this.configuration = {
            bundlePolicy: "max-compat",
            iceServers: settings.iceServers,
        };
        this.peers = settings.peers;
        this.enable_loopback = settings.enableLoopback;
        this.channels = new Map();
        this.user_channels = new Map();
        this.connections = new Map();
        for (const peer of this.peers) {
            if (peer === this.id) {
                continue;
            }
            this.#createRTCPeerConnection(peer);
        }
        if (this.enable_loopback) {
            (async () => {
                await this.#createLoopback();
            })();
        }
    }
    async #createLoopback() {
        try {
            this.loopback1 = new RTCPeerConnection();
            if (typeof this.loopback1 === "undefined") {
                console.error("Failed to create loopback#1 RTCPeerConnection.");
                return;
            }
            this.loopback2 = new RTCPeerConnection();
            if (typeof this.loopback2 === "undefined") {
                console.error("Failed to create loopback#2 RTCPeerConnection.");
                return;
            }
            this.loopback1.onicecandidate = (event) => {
                if (typeof this.loopback2 === "undefined") {
                    return;
                }
                // Ignore null candidate, which indicates that ICE gathering has finished.
                if (!event.candidate) {
                    return;
                }
                try {
                    this.loopback2.addIceCandidate(event.candidate);
                }
                catch (e) {
                    console.error(e);
                }
            };
            this.loopback2.onicecandidate = (event) => {
                if (typeof this.loopback1 === "undefined") {
                    return;
                }
                // Ignore null candidate, which indicates that ICE gathering has finished.
                if (!event.candidate) {
                    return;
                }
                try {
                    this.loopback1.addIceCandidate(event.candidate);
                }
                catch (e) {
                    console.error(e);
                }
            };
            this.loopback2.ondatachannel = (event) => {
                console.info('LOOPBACK', event);
                this.loopback_receive_channel = event.channel;
                this.loopback_receive_channel.onmessage = (event) => {
                    this.dispatchEvent(new CustomEvent("message", {
                        detail: event.data,
                    }));
                };
            };
            this.loopback_send_channel = this.loopback1.createDataChannel("loopback");
            const offer = await this.loopback1.createOffer();
            await this.loopback1.setLocalDescription(offer);
            await this.loopback2.setRemoteDescription(offer);
            const answer = await this.loopback2.createAnswer();
            await this.loopback2.setLocalDescription(answer);
            await this.loopback1.setRemoteDescription(answer);
        }
        catch (e) {
            console.error(e);
        }
    }
    user_channel(peer) {
        return this.user_channels.get(peer);
    }
    readyState(peer) {
        const channel = this.channels.get(peer);
        if (typeof channel === "undefined") {
            return "new";
        }
        return channel.readyState;
    }
    #createRTCPeerConnection(peer) {
        const new_connection = new RTCPeerConnection(this.configuration);
        this.connections.set(peer, new_connection);
        console.log("new connection", peer, new_connection);
    }
    #createRTCDataChannels(peer, connection) {
        console.log(`#createRTCDataChannels(${peer})`);
        this.#createPrimaryDataChannel(peer, connection);
        this.#createUserDataChannel(peer, connection);
    }
    #createPrimaryDataChannel(peer, connection) {
        const new_channel = connection.createDataChannel(this.label, {
            ordered: true,
            maxPacketLifeTime: 1000,
            negotiated: true,
            id: 0,
        });
        //		new_channel.addEventListener("bufferedamountlow", (event) => {
        //			console.log(event);
        //		});
        // Cannot re-open data channel with same id.
        new_channel.addEventListener("close", (event) => {
            console.log(event);
            //			queueMicrotask(() => this.close(peer));
        });
        new_channel.addEventListener("closing", (event) => {
            console.log(event);
        });
        new_channel.addEventListener("error", (event) => {
            console.log(event);
        });
        new_channel.addEventListener("message", (event) => {
            //			console.log(event);
            this.dispatchEvent(new CustomEvent("message", {
                detail: event.data,
            }));
        });
        new_channel.addEventListener("open", (event) => {
            console.log(event);
        });
        this.channels.set(peer, new_channel);
        console.log("new channel", peer, new_channel);
    }
    #createUserDataChannel(peer, connection) {
        const new_channel = connection.createDataChannel(this.label, {
            ordered: false,
            maxPacketLifeTime: 6000,
            negotiated: true,
            id: 1,
        });
        // Cannot re-open data channel with same id.
        new_channel.addEventListener("close", (event) => {
            console.log(event);
            this.dispatchEvent(new CustomEvent('removechannel', {
                detail: {
                    id: peer,
                }
            }));
        });
        new_channel.addEventListener("open", (event) => {
            console.log(event);
            this.dispatchEvent(new CustomEvent('addchannel', {
                detail: {
                    id: peer,
                }
            }));
        });
        this.user_channels.set(peer, new_channel);
        console.log("new user channel", peer, new_channel);
    }
    async #destroy(id) {
        console.log(`#destroy(${id})`);
        const channel = this.channels.get(id);
        if (channel instanceof RTCDataChannel) {
            if (channel.readyState !== "closed") {
                await new Promise(resolve => {
                    channel.addEventListener('close', (event) => {
                        resolve();
                    });
                });
                channel.close();
            }
            this.channels.delete(id);
        }
        const user_channel = this.user_channels.get(id);
        if (user_channel instanceof RTCDataChannel) {
            if (user_channel.readyState !== "closed") {
                await new Promise(resolve => {
                    user_channel.addEventListener('close', (event) => {
                        resolve();
                    });
                });
                user_channel.close();
            }
            this.user_channels.delete(id);
        }
        const connection = this.connections.get(id);
        if (connection instanceof RTCPeerConnection) {
            if (connection.connectionState !== "closed") {
                //				await new Promise(resolve => {
                //					connection.addEventListener('connectionstatechange', (event) => {
                //						if(connection.connectionState === "closed") {
                //							resolve();
                //							return;
                //						}
                //						connection.close();
                //					});
                //				});
                connection.close();
            }
            this.connections.delete(id);
        }
    }
    async close(id) {
        console.log(`close(${id})`);
        await this.#destroy(id);
        // REF: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/close
        // Make sure that you delete all references to the previous
        // RTCPeerConnection before attempting to create a new one that
        // connects to the same remote peer.
        queueMicrotask(() => this.#createRTCPeerConnection(id));
    }
    addIceCandidate(id, candidate) {
        console.log(`addIceCandidate(${id}, ${candidate})`);
        const connection = this.connections.get(id);
        if (typeof connection === "undefined") {
            return;
        }
        if (candidate === null) {
            return;
        }
        connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
    // Origin side:
    createOffer(id) {
        console.log(`createOffer(${id})`);
        (async () => {
            const connection = this.connections.get(id);
            if (typeof connection === "undefined") {
                console.error("no connection");
                return;
            }
            connection.onconnectionstatechange = event => {
                console.log(event);
                this.#webrtc_onconnectionstatechange(connection, id);
            };
            connection.onicecandidate = event => {
                console.log(event);
                this.#webrtc_onicecandidate(connection, id, event.candidate);
            };
            try {
                this.#createRTCDataChannels(id, connection);
            }
            catch (e) {
                console.warn(e);
                try {
                    await this.close(id);
                    console.log("RTC connection closed.");
                }
                catch (e) {
                    console.warn(e);
                }
                finally {
                    const event = new CustomEvent('failed', {
                        detail: {
                            id,
                        }
                    });
                    this.dispatchEvent(event);
                }
                return;
            }
            const offer = await connection.createOffer({
                iceRestart: false,
                offerToReceiveAudio: false,
                offerToReceiveVideo: false,
            });
            // Triggering ICE candidate generation.
            await connection.setLocalDescription(offer);
            const event = new CustomEvent('offer', {
                detail: {
                    id,
                    sdp: offer.sdp,
                },
            });
            this.dispatchEvent(event);
        })();
    }
    addAnswer(id, sdp) {
        console.log(`addAnswer(${id}, ${sdp})`);
        const connection = this.connections.get(id);
        if (typeof connection === "undefined") {
            return;
        }
        const desc = new RTCSessionDescription({ type: "answer", sdp });
        connection.setRemoteDescription(desc);
    }
    broadcast(data) {
        for (const channel of this.channels.values()) {
            if (channel.readyState !== "open") {
                continue;
            }
            try {
                //				console.log("send ->", channel.label, data);
                channel.send(data);
            }
            catch (e) {
                console.warn(e);
            }
        }
        if (this.loopback_send_channel instanceof RTCDataChannel
            && this.loopback_send_channel.readyState === "open") {
            try {
                this.loopback_send_channel.send(data);
            }
            catch (e) {
                console.warn(e);
            }
        }
    }
    // Receiver side:
    createAnswer(id, sdp) {
        console.log(`createAnswer(${id}, ${sdp})`);
        (async () => {
            const connection = this.connections.get(id);
            if (typeof connection === "undefined") {
                return;
            }
            connection.onconnectionstatechange = event => {
                console.log(event);
                this.#webrtc_onconnectionstatechange(connection, id);
            };
            connection.onicecandidate = event => {
                console.log(event);
                this.#webrtc_onicecandidate(connection, id, event.candidate);
            };
            try {
                this.#createRTCDataChannels(id, connection);
            }
            catch (e) {
                console.warn(e);
                this.close(id)
                    .then(() => {
                    console.log("RTC connection closed.");
                })
                    .catch(e => {
                    console.warn(e);
                })
                    .finally(() => {
                    const event = new CustomEvent('failed', {
                        detail: {
                            id,
                        }
                    });
                    this.dispatchEvent(event);
                });
                return;
            }
            const desc = new RTCSessionDescription({ type: "offer", sdp });
            await connection.setRemoteDescription(desc);
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            const event = new CustomEvent('answer', {
                detail: {
                    id,
                    sdp: answer.sdp,
                },
            });
            this.dispatchEvent(event);
        })();
    }
    #webrtc_onconnectionstatechange(connection, id) {
        switch (connection.connectionState) {
            case 'disconnected':
                this.#webrtc_ondisconnected(connection, id);
                break;
            default:
                break;
        }
    }
    #webrtc_ondisconnected(connection, id) {
        const event = new CustomEvent('disconnected', {
            detail: {
                id,
            },
        });
        this.dispatchEvent(event);
    }
    #webrtc_onicecandidate(connection, id, candidate) {
        const event = new CustomEvent('icecandidate', {
            detail: {
                id,
                candidate,
            },
        });
        this.dispatchEvent(event);
    }
}
//# sourceMappingURL=rtcmesh.js.map