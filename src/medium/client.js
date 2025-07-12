var pc = null;
let sessionid = null;
// const url = "http://10.7.3.50:8010";
const url = "http://10.7.11.111:8010";
function negotiate() {
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });
  return pc
    .createOffer()
    .then((offer) => {
      return pc.setLocalDescription(offer);
    })
    .then(() => {
      // wait for ICE gathering to complete
      return new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
        }
      });
    })
    .then(() => {
      var offer = pc.localDescription;

      // console.log(
      //   JSON.stringify({
      //     sdp: offer.sdp,
      //     type: offer.type,
      //   })
      // );
      // return;
      // return fetch("http://10.7.9.111:8010/offer", {
      // old used
      // return fetch("http://10.7.3.50:8010/offer", {
      return fetch(url + "/offer", {
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    })
    .then((response) => {
      return response.json();
    })
    .then((answer) => {
      // document.getElementById("sessionid").value = answer.sessionid;
      sessionid = answer.sessionid;
      return pc.setRemoteDescription(answer);
    })
    .catch((e) => {
      console.log(e);
    });
}

export function uploadToHuman(text) {
  if (!sessionid) return;
  fetch(url + "/human", {
    body: JSON.stringify({
      text: text,
      type: "chat",
      interrupt: true,
      sessionid,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function start() {
  var config = {
    sdpSemantics: "unified-plan",
  };

  // if (document.getElementById("use-stun").checked) {
  //   config.iceServers = [{ urls: ["stun:stun.l.google.com:19302"] }];
  // }

  pc = new RTCPeerConnection(config);
  window.pc = pc;

  let a = document.getElementById("video");
  let b = document.getElementById("audio");
  // connect audio / video
  pc.addEventListener("track", (evt) => {
    if (evt.track.kind == "video") {
      document.getElementById("video").srcObject = evt.streams[0];
    } else {
      document.getElementById("audio").srcObject = evt.streams[0];
    }
  });

  // document.getElementById("start").style.display = "none";
  negotiate();
  // document.getElementById("stop").style.display = "inline-block";
}

export function stop() {
  // close peer connection
  setTimeout(() => {
    pc.close();
  }, 500);
}

window.onunload = function (event) {
  // 在这里执行你想要的操作
  setTimeout(() => {
    pc.close();
  }, 500);
};

window.onbeforeunload = function (e) {
  pc.close();
  e = e || window.event;
  // 兼容IE8和Firefox 4之前的版本
  if (e) {
    e.returnValue = "关闭提示";
  }
  // Chrome, Safari, Firefox 4+, Opera 12+ , IE 9+
  return "关闭提示";
};
