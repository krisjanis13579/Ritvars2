window.TMultiWriter = function( n, ld, times, callback, bgColIdx ) {
    var self = this;
    var t; // running instance
    var sz = ld.getLogicalBlockCnt();

    var createTimeout = function() {
      t = setTimeout( "window.tmp001.performOneWrite()", 250 );
    }

    this.performOneWrite = function() {
      var rnd = Utils.genRandomTwoBytes();
      rnd = rnd * 16 + bgColIdx;

      ld.writeBlockAndRender(n, rnd);
      ld.selectLogicalBlock( n );

      times--;
      n++;
      if ( times != 0 && n<sz ) {
        createTimeout();
      } else {
        if ( n < sz ) ld.selectLogicalBlock( n ); // ieziimee bloku aiz peed modificeetaa
        if ( callback!=null ) { callback(); }
      }
    }

    this.go = function() {
      if ( times <= 0 ) {
        alert( "0 times exec request" );
        return;
      }

      window["tmp001"] = self; // TODO random
      createTimeout();
    }
}
