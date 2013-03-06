chrome.devtools.panels.create(
  "SWFCruller",
  "icon.png",
  "panel.html",
  function (panel) {
    var code = [
        "window.stage = null;",
        "window.addEventListener('message', function(event) {",
          "if (event.source != window) return;",
          "var message = event.data;",
          "if (message.from !== 'devtools') return;",
          //"console.log('[Web page] postMessage received.', message);",
          "if (message.type === 'echo') {",
            "window.postMessage(JSON.stringify({from: 'webpage', type: 'echo'}), '*');",
          "} else if (message.type === 'togglePlay') {",
            "if (!stage) return;",
            "if (stage.isOpen) {",
              "stage.close();",
            "} else {",
              "stage.open();",
            "}",
            "window.postMessage(JSON.stringify({",
              "from: 'webpage', type: 'playbackstate',",
              "data: (stage.isOpen ? 'playing' : 'stopped')",
            "}), '*');",
          "} else if (message.type === 'inject') {",
          "if (window.theatre) {",
            "var swfcrew = window.theatre.crews.swf;",
            "var actions = swfcrew.actions;",
            "var actors = swfcrew.actors;",
            "var Player  = swfcrew.Player;",
            "var WrapperPlayer = function () {",
              "Player.apply(this, arguments);",
              "window.stage = this.stage;",
            "};",
            "WrapperPlayer.prototype = Object.create(Player.prototype);",
            "WrapperPlayer.prototype.constructor = WrapperPlayer;",
            "swfcrew.Player = WrapperPlayer;",
            "var origMethods = {",
              "add: actions.add,",
              "replace: actions.replace,",
              "remove: actions.remove",
            "};",
            "var messageData = {from: 'webpage', type: 'actions', data: null};",
            "var overrideActions = function (pAction) {",
                "actions[pAction] = function (pSpriteActor, pData) {",
                  "var tId, tType, tActor;",
                  "if (pData.id) {",
                    "tId = pData.id;",
                    "tActorClass = pSpriteActor.player.loader.actorMap[tId];",
                    "tType = tActorClass.prototype.displayListType;",
                  "} else {",
                    "tActor = pSpriteActor.getActorAtLayer(pData.depth);",
                    "tId = tActor.displayListId;",
                    "tType = tActor.displayListType;",
                  "}",
                  "tType = tType ? tType.substring(6) : '';",
                  "messageData.data = {",
                    "action: pAction,",
                    "parent: pSpriteActor.displayListId,",
                    "target: tId,",
                    "type: tType,",
                    "layer: pData.depth",
                  "};",
                  //"console.log('postMessage: ', JSON.stringify(messageData));",
                  "window.postMessage(JSON.stringify(messageData), '*');",
                  "return origMethods[pAction](pSpriteActor, pData);",
                "};",
              "};",
            "overrideActions('add');",
            "overrideActions('replace');",
            "overrideActions('remove');",
          "}",
          "}",
        "}, false);",
        "window.onload = function () {",
          "window.postMessage(JSON.stringify({from: 'webpage', type: 'loaded'}), '*');",
        "}"
      ];

    chrome.devtools.inspectedWindow.reload({
      injectedScript: code.join('')
    });

    // Establish a connection with the background page.
    var port = chrome.extension.connect();

    // Create buttons.
    var playbackButton = panel.createStatusBarButton('stop.jpg', 'pause/resume the playback of SWF', false);
    playbackButton.onClicked.addListener(function () {
      port.postMessage({from:'devtools', type: 'togglePlay'});
    });

    port.onMessage.addListener(function f (message) {
      if (message.type === 'loaded') {
        // Trigger the injection to the web page 
        //  so that it can overwrite the existing SWFCrew methods.
        port.postMessage({from:'devtools', type: 'inject'});
      }
    });

    var initialized = false;

    panel.onShown.addListener(function (window) {

      if (initialized) {
        return;
      }

      // Show the root sprite.
      var document = window.document;
      root = document.getElementById('0');
      root.innerHTML = 'id: 0 (RootSprite)';
      root.style.position = 'relative';
      root.style.color = 'blue';

      // The element added to the screen at last.
      var lastAdded = null;

      // Set the UI listeners.
      port.onMessage.addListener(function (message) {
        if (message.from !== 'webpage') return;
        var data = message.data;
        if (message.type === 'echo') {
          ;
        } else if (message.type === 'actions') {
          // Display the data inspected.
          var parent = document.getElementById(data.parent);
          if (data.action === 'add') {
            var elem = document.createElement('div');
            elem.id = data.target;
            elem.innerHTML = 'id: ' + data.target + ' (' + data.type + ')';
            elem.style.position = 'relative';
            elem.style.marginLeft = '20px';
            elem.style.color = 'red';
            if (lastAdded && lastAdded.style) {
              lastAdded.style.color = 'blue';
            }
            lastAdded = elem;
            parent.appendChild(elem);
          } else {
            var elem = document.getElementById(data.target);
            if (lastAdded === elem) lastAdded = null;
            parent.removeChild(elem);
          }
        } else if (message.type === 'playbackstate') {
          // Switch the playback button.
          if (data === 'stopped') {
            playbackButton.update('play.jpg', null, false);
          } else {
            playbackButton.update('stop.jpg', null, false);
          }
        }
      });
      initialized = true;
    });
  });
