# RTCMesh
A convenience class to manage WebRTC connection setup, but keeping the signaling service fully external.  Creates a [full mesh network toplogy](https://en.wikipedia.org/wiki/Mesh_networking).

## Example Usage
```
import { RTCMesh } from "rtcmesh";

const rtc = new RTCMesh({
	label: "8cc1fe24-ae72-416f-a6d3-b09d33d9c0e1",
	id: "f7ac595c-45be-477c-a2f9-e8e33cb45b9c",
	peers: [
		"f7ac595c-45be-477c-a2f9-e8e33cb45b9c",
		"47582a65-8da0-48fc-a02b-e876546c9492",
		"869564f3-c62f-4ed5-8c7b-3849146c3f97",
	],
	iceServers: [
		{ urls: "stun:stun.l.google.com:19302" },
	],
});
```

## Parameters
| Field | Description | Example |
| --- | --- | --- |
| `label` | Name for the broadcast group, applied to all `RTCDataChannel` instances to aid debugging in browser devtools. | `"8cc1fe24"` |
| `id` | Unique _address_ for this node. | `"f7ac595c"` |
| `peers` | List of all nodes in the network. | `[ "f7ac595c", "47582a65", "869564f3" ]` |
| `iceServers` | ICE server parameter clause, for enumerating STUN and TUN servers. | `[ { urls: "turn:turnserver.example.org", username: "webrtc", credential: "turnpassword" } ]` |

## Events
[`offer`](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer)

Fired when the SDP describing a generated offer is ready to deliver through the signaling server to a remote peer.

[`icecandidate`](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event)

Fired when an ICE candidate has been identified and added to the local peer.  The candidate should be transmitted to the remote peer over the signaling channel.

[`disconnected`](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event)

At least one of the ICE transports for the connection is in the `disconnected` state.

`failed`

Creation of a `RTCDataChannel` failed, but can be reattempted later.

`addchannel`

A `RTCDataChannel` was succesfully created and is ready for message transfer.

`removechannel`

A previously `open` `RTCDataChannel` is now closed, the `RTCPeerConnection` must be recreated.

`message`

A message has been received from a remote peer.

## Instance properties
_Also inherits properties from [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)._


## Instance methods
_Also inherits methods from [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)._

[`user_channel()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)

Returns the `RTCDataChannel` associated with a connection to the provided peer address.

[`readyState()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/readyState)

Indicates the current state of the channel to the provided peers address by returning one of the strings `new`, `connecting`, `open`, `closing`, or `closed`.

[`close()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/close)

Closes the `RTCDataChannel` associated with a given address.

[`addIceCandidate()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate)

Adds a new remote candidate to the `RTCPeerConnection` for a given address.

[`createOffer()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer)

Initiates creation of an SDP offer to start a new WebRTC connection to a remote peer.

[`createAnswer()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer)

Initiates createion of an SDP answer to an offer received from a remote peer.

[`addAnswer()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription)

Sets the specified session description as the remote peers current answer for a given hub-spoke connection.

[`broadcast()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/send)

Sends data across all the `open` data channels to remote peers in the broadcast network.


# Raft
A class implementing [The Raft Consensus Algorithm](https://raft.github.io/).  The underlying network is fully external to the implementation.

## Example Usage
```
import { Raft } from "raft";

const raft = new Raft({
	address: "f7ac595c-45be-477c-a2f9-e8e33cb45b9c",
	electionMinTimeout: 1500,
	electionMaxTimeout: 3000,
	heartbeatInterval: 500,
});

function sendReply(data) {}

raft.join("47582a65-8da0-48fc-a02b-e876546c9492", sendReply);
raft.join("869564f3-c62f-4ed5-8c7b-3849146c3f97", sendReply);
```

## Parameters
| Field | Description | Example |
| --- | --- | --- |
| `address` | Unique _address_ for this node. | `"8cc1fe24"` |
| `electionMinTimeout` | Minimum election timeout. | `150` (ms) |
| `electionMaxTimeout` | Maximum election timeout. | `300` (ms) |
| `heartbeatInterval` | Leader heartbeat interval.  | `50` (ms) |

## Events
`join`

Fired when a node has been added to the Raft network.

`leave`

Fired when a node has been removed from the Raft network.

`closing`

The Raft network has started the process of shutting down.

`closed`

The Raft network has been completely shutdown.

## Instance properties
_Also inherits properties from [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)._

`leader`

The unique _address_ of the node that has been elected the leader of the network.

## Instance methods
_Also inherits methods from [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)._

`onRaftMessage()`

Process a Raft message received from a remote peer node.

`update()`

Update the Raft state engine, sending out heartbeat messages, and transitioning between follower, candidate, and leader states.

`join()`

Adds a new node to the Raft network, and a user-defined callback to send a message to that node.

`leave()`

Remove a node from the Raft network.

`close()`

Initiates shutdown of the Raft network.
