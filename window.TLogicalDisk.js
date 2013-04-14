window.TLogicalDisk = function( uid, stripeWidth, physicalDisks ) {
  var self = this;
  var diskCnt = physicalDisks.length;
  var dataBlocksPerStripe = (diskCnt-1) * stripeWidth;

  var blockCntPerDisk = -1;
  var logicalBlockCnt = -1;

  var deadDiskCnt = 0;

  var rawData = null;
  var visibleData = null;

  var containerId = null;
  var cpId = null;
  var mainCpId = null;
  var selectedBlockNo = -1;

  var locked = false; //read only mode

  // "konstruktors"
  (function(){
    blockCntPerDisk = physicalDisks[0].getBlockCnt();
    var tmp;
    for (var i=0; i<diskCnt; i++) {
        physicalDisks[i].setTitleAndRender("Fiziskais disks: " + i);

        tmp = physicalDisks[i].getBlockCnt();
        if ( tmp < blockCntPerDisk ) blockCntPerDisk = tmp;
    }
    blockCntPerDisk = blockCntPerDisk - (blockCntPerDisk % stripeWidth);

    logicalBlockCnt = blockCntPerDisk * (diskCnt-1);

    rawData = new Array( logicalBlockCnt );
    visibleData = new Array( logicalBlockCnt );
  })();

    this.extractColor = function( n ) {
        return rawData[ n ] % 16;
    }

  this.getLogicalBlockCnt = function() { return logicalBlockCnt; }

  // f-jas vnk maina kraasas - 4 internal use
  var setBgNoReg = function( blockNo, bg ) {
    var cell = $( "#" + uid + blockNo );
    cell.attr( "style", "background-color: " + bg + ";" );
  }

  var setBgNoRegIdx = function( blockNo, bgIdx ) {
    var bg = window.colorList[ bgIdx ];
    setBgNoReg( blockNo, bg );   
  }

  var select = function( blockNo ) { setBgNoReg( blockNo, Utils.getSelectionColor() ); }
  var unselect = function( blockNo ) { setBgNoRegIdx( blockNo, self.extractColor( blockNo ) ); }
  //

  // atrod fizisko atrashanaas vietu logjiskajam blokam
  var whereIs = function( n ) {
    var stripeNo = Utils.div( n, dataBlocksPerStripe );
    var parityDiskNo = stripeNo % diskCnt;
    var blockInStripe = n % dataBlocksPerStripe;
    var phDiskInStripe = Utils.div( blockInStripe, stripeWidth );
    if (phDiskInStripe >= parityDiskNo) phDiskInStripe++;

    var phBlockNo = (stripeNo * stripeWidth) + (blockInStripe % stripeWidth);

    // sapakojam
    var o = {};
    o.stripeNo = stripeNo;
    o.parityDiskNo = parityDiskNo;
    o.blockInStripe = blockInStripe;
    o.phDiskInStripe = phDiskInStripe;
    o.phBlockNo = phBlockNo;

    return o;
  }

  // atrod log bloka veertiibu, nolasot to no fiz diska
  var internalReadLogicalBlock = function( n ) {
    var o = whereIs(n);
    return physicalDisks[ o.phDiskInStripe ].readBlock( o.phBlockNo );
  }

  // aizpilda buferus (cache)
  this.initAllLogicalData = function() {
    for (var i=0; i<logicalBlockCnt; i++) {
      rawData[i] = internalReadLogicalBlock( i );
      visibleData[i] = Utils.rawToVisible( rawData[i] );
    }
  }

  // ieraksta fiz diskaa, ieliek buferos, atteelo izmainas uz ekraana
  this.writeBlockAndRender = function( n, newValue ) {
    // sho nav korekti izsaukt, ja dead disk count > 1

    var loc = whereIs( n );

    if ( physicalDisks[ loc.parityDiskNo ].isDead() ) { // parity disk dead
        self.writeBlockAndRenderParityDiskDead( n, newValue, loc );
    } else if ( physicalDisks[ loc.phDiskInStripe ].isDead() ) { // data disk dead
        self.writeBlockAndRenderDataDiskDead( n, newValue, loc );
    } else { // all ok
        var oldValue = physicalDisks[ loc.phDiskInStripe ].readBlock( loc.phBlockNo );
        var oldParity = physicalDisks[ loc.parityDiskNo ].readBlock( loc.phBlockNo );

        var newParity = oldParity ^ oldValue ^ newValue;

        physicalDisks[ loc.phDiskInStripe ].writeBlock( loc.phBlockNo, newValue ).renderBlock( loc.phBlockNo );
        physicalDisks[ loc.parityDiskNo ].writeBlock( loc.phBlockNo, newParity ).renderBlock( loc.phBlockNo, true );
    }

    // cache
    rawData[ n ] = newValue;
    visibleData[ n ] = Utils.rawToVisible( newValue );

    //ld render-s
    document.getElementById( uid + n ).innerHTML =  visibleData[ n ];
    if ( n != selectedBlockNo ) setBgNoRegIdx( n, self.extractColor( n ) );
  }

  this.writeBlockAndRenderParityDiskDead = function( n, newValue, loc ) {
    // easy - rakstam datus, ignoreejam paritaati
    physicalDisks[ loc.phDiskInStripe ].writeBlock( loc.phBlockNo, newValue ).renderBlock( loc.phBlockNo );
  }

  this.writeBlockAndRenderDataDiskDead = function( n, newValue, loc ) {
    // tiks mainiita tikai paritaate. sa-xor-ojam visus dziivos blokus un newValue
    var newParity = newValue;
    var i;

    for (i=0; i<diskCnt; i++) {
        if ( i != loc.phDiskInStripe && i != loc.parityDiskNo ) newParity ^= physicalDisks[ i ].readBlock( loc.phBlockNo );
    }

    physicalDisks[ loc.parityDiskNo ].writeBlock( loc.phBlockNo, newParity ).renderBlock( loc.phBlockNo, true );
  }

  // atver edit logu logjiskajam blokam n
  var openEditDialog = function( n ) {
    var paramObj = {}
    paramObj.curValue = Utils.toHex( Utils.div( rawData[n], 16 ), 4 );
    paramObj.curColor = window.colorList[ self.extractColor( n ) ];
    paramObj.ld = self;
    paramObj.n = n;

    $('#edit-dialog-form').dialog( 'option', 'params', paramObj );
    $('#edit-dialog-form').dialog( 'open' );
  }

  var openMultiWriteDialog = function( n ) {
    var paramObj = {}
    paramObj.ld = self;
    paramObj.n = n;

    $('#multiwrite-dialog-form').dialog( 'option', 'params', paramObj );
    $('#multiwrite-dialog-form').dialog( 'open' );
  }

  // uzziimee control-panel logjiskajam blokam n
  var renderCp = function( n ) {
    var id = "cp_" + uid + n;
    var editHtml = '[<span class="anchor">edit</span>]';
    editHtml += '[<span class="anchor">mwrite</span>]';

    var box = document.getElementById( id );
    box.innerHTML = editHtml;

    var jqAnchors = $(".anchor", box);
    $( jqAnchors.get(0) ).bind( "click", function() {
      openEditDialog( n );
    } );

    $( jqAnchors.get(1) ).bind( "click", function() {
      openMultiWriteDialog( n );
    } );
  }

  // novaac control-panel logjiskajam blokam n
  var unrenderCp = function( n ) {
    var id = "cp_" + uid + n;
    document.getElementById( id ).innerHTML = '&nbsp;';
  }



  // ieziimee logjisko bloku un attieciigo fiz bloku, novaac ieziimeejumu vecajiem
  this.selectLogicalBlock = function( n ) {
    if (selectedBlockNo == n) return;

    if ( selectedBlockNo >= 0 ) {
      unselect( selectedBlockNo );
      if (!locked) unrenderCp( selectedBlockNo );
      var oldPhLoc = whereIs( selectedBlockNo );
      if (physicalDisks[ oldPhLoc.phDiskInStripe ] != null) physicalDisks[ oldPhLoc.phDiskInStripe ].unselect( oldPhLoc.phBlockNo );
    }

    select( n );
    if (!locked) renderCp( n );
    var phLoc = whereIs( n );
    if (physicalDisks[ phLoc.phDiskInStripe ] != null) physicalDisks[ phLoc.phDiskInStripe ].select( phLoc.phBlockNo );

    selectedBlockNo = n;
  }

  var renderDiskStripes = function( diskNo ) {
        var i,j, stripeClass,diskClass, parityDiskNo;
        var stripeCnt = Utils.div( blockCntPerDisk, stripeWidth );
    
        for (i=0; i<stripeCnt; i++) {
          stripeClass = i % 2 == 0 ? "stripe0" : "stripe1";
          parityDiskNo = i % diskCnt;
          diskClass = diskNo == parityDiskNo ? "pari_td" : "";
          for (j=0; j<stripeWidth; j++) {
              physicalDisks[diskNo].setCssClass( i * stripeWidth + j, $.trim( stripeClass + " " + diskClass ) );
          }          
        }
  }

  this.rebuildDestroyedBlock = function( diskNo, blockNo ) {
    var i,j, parityDiskNo;

    var stripeNo = Utils.div(blockNo, stripeWidth);
    var parityDiskNo = stripeNo % diskCnt;

    var restoredValue = 0; // a xor 0 == a
    for (i=0; i<diskCnt; i++) {
        if ( i != diskNo ) restoredValue ^= physicalDisks[ i ].readBlock( blockNo );
    }

    physicalDisks[ diskNo ].writeBlock( blockNo, restoredValue ).renderBlock( blockNo, parityDiskNo == diskNo );
  }

  this.attachReplacementDisk = function( diskNo, diskSz ) {
    physicalDisks[ diskNo ].destroy( "Fiziskais disks: " + diskNo );
    var renderArgs = physicalDisks[ diskNo ].backupRenderData();

    physicalDisks[ diskNo ] = null;

    physicalDisks[ diskNo ] = new TPhysicalDisk( uid + "repl_" + diskNo, diskSz );
    physicalDisks[ diskNo ].displayAsJustReplaced();//blockCntPerDisk

    physicalDisks[ diskNo ].render(renderArgs.containerId, renderArgs.tbId);
    renderDiskStripes(diskNo);
  }

  this.registerSuccessfulRecovery = function() {deadDiskCnt--;}

  var refreshAndRenderData = function() { //paarlasa datus no fiz diskiem
    var o,i;
    var value;

    //refresh
    for (i=0; i<logicalBlockCnt; i++) {
      o = whereIs( i );
      if ( physicalDisks[ o.phDiskInStripe ].isDead() ) {
        rawData[i] = 0; //0 lai buutu balts :)
        visibleData[i] = "";
      } else {
        value = physicalDisks[ o.phDiskInStripe ].readBlock( o.phBlockNo );
        rawData[i] = value;
        visibleData[i] = Utils.rawToVisible( rawData[i] );
      }
    }


    //render
    for (i=0; i<logicalBlockCnt; i++) {
      document.getElementById( uid + i ).innerHTML =  visibleData[ i ];
      if ( i != selectedBlockNo ) setBgNoRegIdx( i, self.extractColor( i ) );
    }

  }

  var markRaidAsDead = function() {
    Utils.alert( "RAID disku masīvs ir nelabojami sabojāts!" );

    if ( selectedBlockNo > 0 ) unrenderCp( selectedBlockNo );
    document.getElementById( mainCpId ).innerHTML = "&nbsp;";
    locked = true;

    refreshAndRenderData();
  }

  this.destroyPhysicalDisk = function( btnObj, diskNo ) {
    if ( physicalDisks[ diskNo ].isDead() ) {
        var paramObj = {}
        paramObj.minDiskSz = blockCntPerDisk;
        paramObj.diskNo = diskNo;
        paramObj.ld = self;
        paramObj.btnObj = btnObj;

        $('#restore-dialog-form').dialog( 'option', 'params', paramObj );
        $('#restore-dialog-form').dialog( 'open' );
    } else {
        physicalDisks[ diskNo ].destroy( "[dead]" );
        var renderArgs = physicalDisks[ diskNo ].backupRenderData();

        physicalDisks[ diskNo ] = null;

        physicalDisks[ diskNo ] = new TPhysicalDisk( uid+"des_"+diskNo, blockCntPerDisk ); // imaginary disk, 4 UI
        physicalDisks[ diskNo ].markAsDead();

        physicalDisks[ diskNo ].render(renderArgs.containerId, renderArgs.tbId);
        renderDiskStripes(diskNo);
        
        btnObj.innerHTML = "Aizvietot: " + diskNo;
        deadDiskCnt++;
        if (deadDiskCnt>1) markRaidAsDead();
    }

  }



  // pievieno listener-i logjiskaa diska blokiem
  var addListenerToTds = function( tableId ) {
    var jqTable = $( "#" + tableId );
    var jqTds = $( "td", jqTable );

    jqTds.bind( "click", function() {
      var logicalBlockNo = this.id.substring( uid.length ) * 1;
      self.selectLogicalBlock( logicalBlockNo );
    });
  }

  // vizualizee logjisko disku uz ekraana
  this.render = function( argContainerId, argCpId, phyAddrsContainerId, argMainCpId ) {
    containerId = argContainerId;
    cpId = argCpId;
    mainCpId = argMainCpId;

    var i, j, k;
    var stripeCnt = Utils.div( blockCntPerDisk, stripeWidth );
    var stripeClass, diskClass, parityDiskNo;
    var tableId = uid + "table";
    var tableHtml;

    // ziimee pashu logjisko disku >>
    tableHtml = '<table style="width: 70px;" class="disk_map log_disk_map" align="center" cellpadding="0" cellspacing="0" id="' + tableId + '">';

    for (i=0; i<logicalBlockCnt; i++) {
      tableHtml += '<tr><td';
      tableHtml += ' id="' + (uid + i) + '">' + visibleData[ i ] + '</td>';
      tableHtml += '</tr>';
    }

    tableHtml += '</table>';

    document.getElementById( containerId ).innerHTML = tableHtml;
    // <<

    //
    tableHtml = '<table style="width: 100%;" class="disk_map" align="center" cellpadding="0" cellspacing="0">';

    for (i=0; i<blockCntPerDisk; i++) {
      tableHtml += '<tr><td';
      tableHtml += '>' + i + '</td>';
      tableHtml += '</tr>';
    }

    tableHtml += '</table>';

    document.getElementById( phyAddrsContainerId ).innerHTML = tableHtml;
    //

    // ziimee CP >>
    tableHtml = '<table class="disk_map" align="right" cellpadding="0" cellspacing="0">';

    for (i=0; i<logicalBlockCnt; i++) {
      tableHtml += '<tr>';

      tableHtml += '<td style="';
      if (i==0) tableHtml += 'width:40px;';
      tableHtml += '">' +i+ '</td>';

      tableHtml += '<td style="text-align:left;';
      if ( i==0 ) tableHtml += 'width:130px;';
      tableHtml += '" id="cp_' +(uid + i)+ '">&nbsp;</td>';

      tableHtml += '</tr>';
    }

    tableHtml += '</table>';

    document.getElementById( cpId ).innerHTML = tableHtml;
    // << ziimee CP

    //
    tableHtml = "";
    for (i=0; i<diskCnt; i++) {
        tableHtml += '<button class="cp_btn" id="' + (uid + "des_reb_btn_" + i) + '">Iznīcināt: ' +i+ '</button>';
    }
    

    document.getElementById( mainCpId ).innerHTML = tableHtml;

    (function(){
        var jqRebDesBtns = $("button[id^=" + (uid + "des_reb_btn_") + "]");
        jqRebDesBtns.bind("click", function(){
            var logicalBlockNo = this.id.substring( (uid + "des_reb_btn_").length ) * 1;
            self.destroyPhysicalDisk(this, logicalBlockNo);
        });
    })();
    //

    // uzliek listener-i
    addListenerToTds( tableId );

    //
    for (i=0;i<diskCnt;i++) {
        physicalDisks[i].displayAsJustRaided( blockCntPerDisk );
        for (j=0;j<blockCntPerDisk;j++) physicalDisks[i].renderBlock(j, true); //melojam, lai nemainiitos fons
    }

    // izkraaso fiziskos diskus
    for (i=0; i<stripeCnt; i++) {
      stripeClass = i % 2 == 0 ? "stripe0" : "stripe1";
      parityDiskNo = i % diskCnt;

      for (k=0; k<diskCnt; k++) {
        diskClass = k == parityDiskNo ? "pari_td" : "";
        for (j=0; j<stripeWidth; j++) {
          physicalDisks[k].setCssClass( i * stripeWidth + j, $.trim( stripeClass + " " + diskClass ) );
        }
      }
    }

  }

}














//
