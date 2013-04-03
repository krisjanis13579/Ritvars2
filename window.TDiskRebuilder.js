window.TDiskRebuilder = function( diskSz, usedBlocks, diskNo, ld, callback ) {
    var self = this;
    var t; // running instance
    var sz = ld.getLogicalBlockCnt();
    var blockToRestore = 0;

    var createTimeout = function() {
      t = setTimeout( "window.tmp001.performIteration()", 50 );
    }

    this.performIteration = function() {
        //
        ld.rebuildDestroyedBlock(diskNo, blockToRestore);
        //

        blockToRestore++;
        if ( blockToRestore < usedBlocks ) {
            createTimeout();
        } else {
            ld.registerSuccessfulRecovery();
            if ( callback!=null ) { callback(); }
        }
    }

    this.go = function() {
      window["tmp001"] = self; // TODO random
      ld.attachReplacementDisk( diskNo, diskSz );

      createTimeout();
    }
}
