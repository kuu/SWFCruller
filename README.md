SWFCruller
==========

Description:
SWFCruller - Extends the Chrome Developer Tools for debugging SWFCrew.
You can use this for monitoring the internal state of running SWFCrew on the Chrome devtools.
[SWFCrew](https://github.com/Moncader/SWFCrew) : FlashPlayer written in JavaScript, developed by Jason Parrott.

Feature (currently supported):
 - Displaying of character-id and type of the display objects currently on the stage.

Usage:
  - Clone this repository.
  - Add 'extensions' directory to Google Chrome as an unpacked extension. (see the [tutorial](http://developer.chrome.com/extensions/getstarted.html#unpacked))
  - Launch Chrome Developer Tools when the swfcrew.js is loaded. (Note that lauching the devtools causes reload of the page.)
  - Choose 'SWFCruller' tab in the devtools panels, then you can see some inspected data on the panel.
