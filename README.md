SWFCruller
==========

Description
----------
SWFCruller extends the Chrome Developer Tools for debugging [SWFCrew](https://github.com/Moncader/SWFCrew), which is a FlashLite player written in JavaScript. This is a dedicated tool for monitoring the internal state of the SWFCrew running on the Chrome browser via the Developer Tools panel.

Features
--------
  - Displaying of the character-id and the type of the display objects currently on the stage.
  - Pausing/Reuming of the playback of the SWF file.

Usage
------
  - Clone this repository.
  - Add 'extension' directory to your Google Chrome browser as an unpacked extension (see the [tutorial](http://developer.chrome.com/extensions/getstarted.html#unpacked).)
  - Launch the browser and open up a web page that uses swfcrew.js
  - Open the Chrome Developer Tools window. (Note that this causes the web page to reload to inject some JavaScript code.)
  - Choose 'SWFCruller' tab in the devtools panels, then you can see some inspected data on the panel.
