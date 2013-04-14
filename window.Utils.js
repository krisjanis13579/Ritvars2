window.Utils = {
  self: this,

  fillArray: function( arr, fillValue, fillCnt ) {
    fillCnt = (fillCnt == null) ? arr.length : fillCnt;
    for (var i=0; i<fillCnt; i++) {
      arr[i] = fillValue;
    }
  },
  //paziòojums
  alert: function( x ) {
    window.alert( x );
  },

  div: function( a, b ) {
    return Math.floor( a/b );
  },
 //pârvçrst uz hex
  toHex: function( n, minW ) {
    var h = n.toString( 16 ).toUpperCase();
    if ( h.length < minW ) {
      h = "0000000000".substring(0, minW-h.length) + h;
    }

    return h;
  },
  //dabût randomus baitus
  genRandomTwoBytes: function() {
    var rndNum = Math.floor( Math.random() * 65536 );
    return rndNum;
  },
  //pârvçrst no HEX
  fromHex: function( hexNum ) {
    return parseInt(hexNum, 16);
  },

  indexOf: function( arr, elem ) {
    var idx = -1;
    for ( var i=0; i<arr.length; i++ ) if ( elem == arr[i] ) idx = i;
    return idx;
  },

  getSelectionColor: function() { return "#CC6633"; },
  errorize: function( jqInputField ) { jqInputField.addClass('ui-state-error'); },

  rawToVisible: function( raw ) {
    return Utils.toHex( Utils.div( raw, 16 ), 4 );
    //return Utils.toHex( raw, 5 );
  }
}

// up to 16 colors
window.colorList = new Array(
    "#FFFFFF", "#EEEEEE", "#FFFF88", "#FF7400", "#CDEB8B", "#6BBA70",
    "#006E2E", "#C3D9FF", "#4096EE", "#356AA0", "#FF0096", "#B02B2C", 
    "#000000", "red"
);

