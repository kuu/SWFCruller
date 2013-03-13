/* 
 * registerWebPageListeners
 * The code for handling the events from the devtools panel needs to be implemented here.
 * @param {Window} global The global object that represents the top-level window or a frame of the web page.
 * Please note that this function will be injected into every frame of the inspected page.
 */
function registerWebPageListeners(global) {

  var myWebPage = global.devtoolsBridge;
  myWebPage.swfcruller = {};
  myWebPage.swfcruller.excludedIds = [];

  /* 
   * global.devtoolsBridge.on
   * @param {string} eventType The event type to listen for.
   * @param {function} listener A callback function.
   * The callback function takes the following arguments:
   *    {object} event The event received from the devtools panel.
   *    {function} sendEvent A function for sending an event to the devtools panel.
   * The sendEvent takes the following arguments:
   *    {string} eventType The event type to send.
   *    {object} params The optional data associated with the event.
   */

  myWebPage.on('load', function (event, sendEvent) {
    if (global.theatre) {
      var uniqueInstanceId = 1;
      var swfcrew = global.theatre.crews.swf;
      var actions = swfcrew.actions;
      var actors = swfcrew.actors;
      var Player  = swfcrew.Player;
      var WrapperPlayer = function () {
        Player.apply(this, arguments);
        myWebPage.swfcruller.player = this;
      };
      WrapperPlayer.prototype = Object.create(Player.prototype);
      WrapperPlayer.prototype.constructor = WrapperPlayer;
      WrapperPlayer.prototype.newFromId = function(pId) {
        var actor = Player.prototype.newFromId.call(this, pId);
        if (actor) actor['uniqueInstanceId'] = uniqueInstanceId++;
        return actor;
      };
      swfcrew.Player = WrapperPlayer;
      var origMethods = {
        add: actions.add,
        replace: actions.replace,
        remove: actions.remove
      };
      var overrideActions = function (pAction) {
        actions[pAction] = function (pSpriteActor, pData) {
          var tId, tType, tActor, tInstanceId, tParentInstanceId;
          var excludedIds = myWebPage.swfcruller.excludedIds;
          var tParam;
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
          tInstanceId = (tActor.uniqueInstanceId || 0);
          tParentInstanceId = (pSpriteActor.uniqueInstanceId || 0);
          tType = tActor.displayListType;
          tType = tType ? tType.substring(6) : '';
          tParam = {
            action: pAction,
            parent: tParentInstanceId,
            target: tInstanceId,
            displayType: tType,
            layer: pData.depth,
            characterId: tId
          };
          sendEvent('actions', {data: tParam});
        };
      };
      overrideActions('add');
      overrideActions('replace');
      overrideActions('remove');
    }
  });

  myWebPage.on('togglePlay', function (event, sendEvent) {
    var stage = myWebPage.swfcruller.player.stage;
    if (!stage) return;
    if (stage.isOpen) {
              stage.close();
    } else {
              stage.open();
    }
    sendEvent('playbackstate', {data: (stage.isOpen ? 'playing' : 'stopped')});
  });

  myWebPage.on('exclude', function (event, sendEvent) {
    var excludedIds = myWebPage.swfcruller.excludedIds = event.data || [];
    sendEvent('excluded', {data: excludedIds});
  });

  myWebPage.on('search', function (event, sendEvent) {
    var stage = myWebPage.swfcruller.player.stage;
    var root = myWebPage.swfcruller.player.root;
    var query = event.data;
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
    sendEvent('search', {data: path});
  });

};
