chrome.devtools.panels.create(
  "SWFCruller",
  "icon.png",
  "panel.html",
  function (panel) {
    var code = [
        "window.addEventListener('message', function(event) {",
          "if (event.source != window) return;",
          "var message = event.data;",
          "if (message.from !== 'devtools') return;",
          "console.log('[Web page] postMessage received.', message);",
          "if (message.type === 'echo') {",
            "window.postMessage(JSON.stringify({from: 'webpage', type: 'echo'}), '*');",
          "} else if (message.type === 'inject') {",
          "if (window.theatre) {",
            "var actions = theatre.crews.swf.actions;",
            "var actors = theatre.crews.swf.actors;",
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
                  "messageData.data = {",
                    "action: pAction,",
                    "parent: pSpriteActor.displayListId,",
                    "target: tId,",
                    "type: tType,",
                    "layer: pData.depth",
                  "};",
                  "console.log('postMessage: ', JSON.stringify(messageData));",
                  "window.postMessage(JSON.stringify(messageData), '*');",
                  "return origMethods[pAction](pSpriteActor, pData);",
                "};",
              "};",
            "overrideActions('add');",
            "overrideActions('replace');",
            "overrideActions('remove');",
          "}",
          "}",
        "}, false);"
      ];

    chrome.devtools.inspectedWindow.reload({
      injectedScript: code.join('')
    });

    var port = chrome.extension.connect();
    panel.onShown.addListener(function (window) {
      port.postMessage({from:'devtools', type: 'inject'});
      var document = window.document;
      root = document.getElementById('0');
      root.innerHTML = 'id: 0 (RootSprite)';
      root.style.position = 'relative';
      root.style.color = 'blue';
      port.onMessage.addListener(function (message) {
        if (message.from !== 'webpage') return;
        var data = message.data;
        if (message.type === 'echo') {
          var nodeList = document.querySelectorAll('*');
          alert('NodeList.length=' + nodeList.length);
        } else if (message.type === 'actions') {
          var parent = document.getElementById(data.parent);
          if (data.action === 'add') {
            var elem = document.createElement('div');
            elem.id = data.target;
            elem.innerHTML = 'id: ' + data.target + ' (' + data.type + ')';
            elem.style.position = 'relative';
            elem.style.marginLeft = '20px';
            elem.style.color = 'blue';
            parent.appendChild(elem);
          } else {
            var elem= document.getElementById(data.target);
            parent.removeChild(elem);
          }
        }
      });
    });
  });
