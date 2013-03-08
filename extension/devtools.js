chrome.devtools.panels.create(
  "SWFCruller",
  "icon.png",
  "panel.html",
  function (panel) {
    var functionToInject = function (global) {
        global.swfcruller = {};
        global.swfcruller.excludedIds = [];
        global.addEventListener('message', function(event) {
          if (event.source != global) return;
          var message = event.data;
          if (message.from !== 'devtools') return;
          //console.log('[Web page] postMessage received.', message);
          if (message.type === 'echo') {
            global.postMessage(global.JSON.stringify({from: 'webpage', type: 'echo'}), '*');
          } else if (message.type === 'togglePlay') {
            var stage = global.swfcruller.player.stage;
            if (!stage) return;
            if (stage.isOpen) {
              stage.close();
            } else {
              stage.open();
            }
            global.postMessage(global.JSON.stringify({
              from: 'webpage', type: 'playbackstate',
              data: (stage.isOpen ? 'playing' : 'stopped')
            }), '*');
          } else if (message.type === 'exclude') {
            var excludedIds = global.swfcruller.excludedIds = message.data || [];
            global.postMessage(global.JSON.stringify({
              from: 'webpage', type: 'excluded',
              data: excludedIds}), '*');
          } else if (message.type === 'search') {
            var stage = global.swfcruller.player.stage;
            var root = global.swfcruller.player.root;
            var query = message.data;
            var doSearch = function (target) {
              if (!target) {
                return null
              } else if (target._name === query) {
                return target;
              }
              var children = target.treeNode.childNodes, result;
              for (var i = 0, il = children.length; i < il; i++) {
                if (result = doSearch(children[i].actor)) {
                  return result;
                }
              }
              return null
            };
            var actor = doSearch(root);
            var path = '';
            while (actor && actor._name) {
              path = '/' + actor._name + path;
              actor = actor.parent;
            }
            global.postMessage(global.JSON.stringify({
              from: 'webpage', type: 'search', data: path}), '*');
          } else if (message.type === 'inject') {
          if (global.theatre) {
            var swfcrew = global.theatre.crews.swf;
            var actions = swfcrew.actions;
            var actors = swfcrew.actors;
            var Player  = swfcrew.Player;
            var WrapperPlayer = function () {
              Player.apply(this, arguments);
              global.swfcruller.player = this;
            };
            WrapperPlayer.prototype = Object.create(Player.prototype);
            WrapperPlayer.prototype.constructor = WrapperPlayer;
            swfcrew.Player = WrapperPlayer;
            var origMethods = {
              add: actions.add,
              replace: actions.replace,
              remove: actions.remove
            };
            var messageData = {from: 'webpage', type: 'actions', data: null};
            var overrideActions = function (pAction) {
                actions[pAction] = function (pSpriteActor, pData) {
                  var tId, tType, tActor, tInstanceId, tParentInstanceId;
                  var excludedIds = global.swfcruller.excludedIds;
                  if (pData.id) {
                    if (excludedIds.indexOf(pData.id) !== -1) {
                      return;
                    }
                    origMethods[pAction](pSpriteActor, pData);
                    tActor = pSpriteActor.getActorAtLayer(pData.depth);
                    if (!tActor) return;
                    tId = tActor.displayListId;
                  } else {
                    tActor = pSpriteActor.getActorAtLayer(pData.depth);
                    if (!tActor) return;
                    tId = tActor.displayListId;
                    if (excludedIds.indexOf(tId) !== -1) {
                      return;
                    }
                    origMethods[pAction](pSpriteActor, pData);
                  }
                  tInstanceId = tActor.uniqueInstanceId;
                  tParentInstanceId = (pSpriteActor.uniqueInstanceId === -1 ? 0 : pSpriteActor.uniqueInstanceId);
                  tType = tActor.displayListType;
                  tType = tType ? tType.substring(6) : '';
                  messageData.data = {
                    action: pAction,
                    parent: tParentInstanceId,
                    target: tInstanceId,
                    type: tType,
                    layer: pData.depth,
                    characterId: tId
                  };
                  //console.log('postMessage: ', JSON.stringify(messageData));
                  global.postMessage(global.JSON.stringify(messageData), '*');
                };
              };
            overrideActions('add');
            overrideActions('replace');
            overrideActions('remove');
          }
          }
        }, false);
        global.onload = function () {
          global.postMessage(global.JSON.stringify({from: 'webpage', type: 'loaded'}), '*');
        }
      }; // var functionToInject

    chrome.devtools.inspectedWindow.reload({
      injectedScript: '(' + functionToInject.toString() + '(this))'
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
      var root = document.getElementById('0');
      root.innerHTML = 'id: 0 (RootSprite)';
      root.style.position = 'relative';
      root.style.color = 'blue';

      // Filter the specified objects.
      var filterText = document.getElementById('filtertxt');
      var filterButton = document.getElementById('filterbtn');
      var excludedList = document.getElementById('excluded');
      var nothingExcludedMsg = excludedList.innerHTML = '<- Chracter ids separated with a space, which then will never be added to the stage.';
      var searchText = document.getElementById('searchtxt');
      var searchButton = document.getElementById('searchbtn');
      var searchResult = document.getElementById('search');
      var emptyResultStr = searchResult.innerHTML = '<- Search by the name of Movie clip.';
      filterButton.addEventListener('click', function () {
        var list = filterText.value, array, id, idList = [];
        if (list) {
          array = list.split(' ');
          for (var i = 0, il = array.length; i < il; i++) {
            id = parseInt(array[i]);
            if (id) idList.push(id);
          }
          if (idList.length > 0) {
            port.postMessage({from:'devtools', type: 'exclude', data: idList});
          }
        }
      }, false);

      searchButton.addEventListener('click', function () {
        port.postMessage({from:'devtools', type: 'search', data: searchText.value});
      }, false);

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
            elem.innerHTML = 'id: ' + data.characterId + ' (' + data.type + ')';
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
        } else if (message.type === 'excluded') {
          // Display the currently excluded objects.
          if (data && data.length > 0) {
            excludedList.innerHTML = 'Excluded id: ' + data.join();
          } else {
            excludedList.innerHTML = nothingExcludedMsg;
          }
        } else if (message.type === 'search') {
          searchResult.innerHTML = data || emptyResultStr;
        }
      });
      initialized = true;
    });
  });
