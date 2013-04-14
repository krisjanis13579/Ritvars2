window.TPhysicalDisk = function( uid, blockCnt ) {
    var self = this;

    var rawData = new Array( blockCnt );
    var visibleData = new Array( blockCnt );

    var containerId = null;
    var tbId = null;
    var selectedBlockNo = -1;
    var title = null;
    var diskDead = false;

    //////////////////////////////////////////

    ( function(){
        Utils.fillArray( rawData, 0 );
        Utils.fillArray( visibleData, "."/*Utils.rawToVisible( 0 )*/ );
    } )();

    var setBgNoReg = function( blockNo, bg ) {
        var cell = $( "#" + uid + blockNo );
        cell.attr( "style", "background-color: " + bg + ";" );
    }

    var setBgNoRegIdx = function( blockNo, bgIdx ) {
        var bg = window.colorList[ bgIdx ];
        setBgNoReg( blockNo, bg );
    }
    //////////////////////////////////////////
    this.markAsDead = function() {
        diskDead = true;
        Utils.fillArray( visibleData, "&nbsp;" );
    }
    this.displayAsJustReplaced = function( fillLimit ) { Utils.fillArray( visibleData, ".", fillLimit ); }
    this.displayAsJustRaided = function( fillLimit ) { Utils.fillArray( visibleData, Utils.rawToVisible( 0 ), fillLimit ); }

    this.isDead = function() { return diskDead; }

    this.getBlockCnt = function() {
        return blockCnt;
    }

    this.readBlock = function( n ) {
        if ( diskDead ) alert( "fatal: reading from dead disk" );
        return rawData[ n ];
    }

    this.extractColor = function( n ) {
        return rawData[ n ] % 16;
    }
    //raksta vienu bloku 
    this.writeBlock = function( n, newValue ) {
       if ( diskDead ) alert( "fatal: writing in dead disk" );
       rawData[ n ] = newValue;
       visibleData[ n ] = Utils.rawToVisible( newValue );

       return self;
    }
   //attçlo disku
    this.render = function( argContainerId, argTbId ) {
        containerId = argContainerId;
        tbId = argTbId;

        var tableHtml = '<table style="width: 100px;" class="disk_map" align="center" cellpadding="0" cellspacing="0">';

        for (var i=0; i<blockCnt; i++) {
            tableHtml += '<tr><td id="' + uid+i + '">' + visibleData[ i ] + '</td></tr>';
        }

        tableHtml += '</table>';

        document.getElementById( containerId ).innerHTML = tableHtml;
    }

    this.backupRenderData = function() {
        var o = {};
        o.containerId = containerId;
        o.tbId = tbId;
        return o;
    }
     //uzliek un attçlo virsrakstu diskiem
    this.setTitleAndRender = function( argTitle ) {
        title = argTitle;
        document.getElementById( tbId ).innerHTML = title;
    }

    this.renderBlock = function( n, parityBlock ) {
      parityBlock = parityBlock === true;  

      document.getElementById( uid + n ).innerHTML =  visibleData[ n ];
      if ( selectedBlockNo != n && !parityBlock) setBgNoRegIdx( n, self.extractColor( n ) );
    }
  //uzliek css klasi
  this.setCssClass = function( blockNo, cssClass ) {
    var cell = document.getElementById( uid + blockNo );
    cell.className = cssClass;
  }

  this.toggleCssClass = function( blockNo, cssClass ) {
    var cell = document.getElementById( uid + blockNo );
    $( cell ).toggleClass( cssClass );
  }

  this.select = function( blockNo ) { selectedBlockNo = blockNo; setBgNoReg( blockNo, Utils.getSelectionColor() ); }
  this.unselect = function( blockNo ) { selectedBlockNo = -1; setBgNoRegIdx( blockNo, self.extractColor( blockNo ) ); }

  // izsaucam pirms null-eejam references uz sho obju
  this.destroy = function( title ) {
    document.getElementById( tbId ).innerHTML = title;
    document.getElementById( containerId ).innerHTML = "";
  }
}











//
