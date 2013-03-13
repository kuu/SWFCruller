/* 
 * registerPanelListeners
 * The code for handling the events from the web pages needs to be implemented here.
 * @param {Window} global The global object that represents the window of the panel.
 * @param {ExtensionPanel} panel An ExtensionPanel object representing the created panel.
 */
function registerPanelListeners(global, panel) {

  var myPanel = global.devtoolsBridge;
  var document = global.document;
  var root = document.getElementById('0');
  root.innerHTML = 'id: 0 (RootSprite)';
  root.style.position = 'relative';
  root.style.color = 'blue';

  var filterText = document.getElementById('filtertxt');
  var filterButton = document.getElementById('filterbtn');
  var excludedList = document.getElementById('excluded');
  var nothingExcludedMsg = excludedList.innerHTML = '<- Chracter ids separated with a space, which then will never be added to the stage.';
  var searchText = document.getElementById('searchtxt');
  var searchButton = document.getElementById('searchbtn');
  var searchResult = document.getElementById('search');
  var emptyResultStr = searchResult.innerHTML = '<- Search by the name of Movie clip.';

  // The element added to the screen at last.
  var lastAdded = null;
  var pendingQueue = [];

  // Create play/pause button.
  var playbackButton = panel.createStatusBarButton('app/img/stop.jpg', 'pause/resume the playback of SWF', false);

  /* 
   * global.devtoolsBridge.on
   * @param {string} eventType The event type to listen for.
   * @param {function} listener A callback function.
   * The callback function takes the following arguments:
   *    {object} event The event received from the web page.
   *    {function} sendEvent A function for sending an event to the web page.
   * The sendEvent takes the following arguments:
   *    {string} eventType The event type to send.
   *    {object} params The optional data associated with the event.
   *    {number} windowId The optional id that represents a specific frame within the tab.
   */
  myPanel.on('load', function (event, sendEvent) {
    playbackButton.onClicked.addListener(function () {
      sendEvent('togglePlay');
    });
    filterButton.addEventListener('click', function () {
      var list = filterText.value, array, id, idList = [];
      if (list) {
        array = list.split(' ');
        for (var i = 0, il = array.length; i < il; i++) {
          id = parseInt(array[i]);
          if (id) idList.push(id);
        }
        if (idList.length > 0) {
          sendEvent('exclude', {data: idList});
        }
      }
    }, false);
    searchButton.addEventListener('click', function () {
      sendEvent('search', {data: searchText.value});
    }, false);
  });

  myPanel.on('actions', function (event, sendEvent) {
    // Display the data inspected.
    var tmpPendingQueue = [], data;
    pendingQueue.push(event.data);
    while (data = pendingQueue.pop()) {
      var parent = document.getElementById(data.parent);
      if (!parent) {
        tmpPendingQueue.push(data);
        continue;
      }
      if (data.action === 'add') {
        var elem = document.createElement('div');
        elem.id = data.target;
        elem.innerHTML = 'id: ' + data.characterId + ' (' + data.displayType + ')';
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
        if (!elem) {
          tmpPendingQueue.push(data);
          continue;
        }
        if (lastAdded === elem) lastAdded = null;
        parent.removeChild(elem);
      }
    }
    pendingQueue = pendingQueue.concat(tmpPendingQueue);
  });

  myPanel.on('playbackstate', function (event, sendEvent) {
    // Switch the playback button.
    if (event.data === 'stopped') {
      playbackButton.update('app/img/play.jpg', null, false);
    } else {
      playbackButton.update('app/img/stop.jpg', null, false);
    }
  });

  myPanel.on('excluded', function (event, sendEvent) {
    // Display the currently excluded objects.
    var excluded = event.data;
    if (excluded && excluded.length > 0) {
      excludedList.innerHTML = 'Excluded id: ' + excluded.join();
    } else {
      excludedList.innerHTML = nothingExcludedMsg;
    }
  });

  myPanel.on('search', function (event, sendEvent) {
    searchResult.innerHTML = event.data || emptyResultStr;
  });
};
