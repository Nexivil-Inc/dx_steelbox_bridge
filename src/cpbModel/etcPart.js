export function SplicePlateV2(gridPointDict, sectionPointDict, sPliceLayout, sPliceSectionList) {
    // VstiffShapeDict(
    //   gridPoint,
    //   sectionPointDict,
    //   vStiffLayout,
    //   vStiffSectionList,
    //   sectionDB
    // ) {
    const section = 2;
    let result = { parent: [], children: [] };
    for (let i = 0; i < sPliceLayout.length; i++) {
      for (let j = 0; j < sPliceLayout[i].length; j++) {
        let gridkey = "G" + (i + 1).toFixed(0) + "SP" + (j + 1).toFixed(0); //vStiffLayout[i][position];
        let sPliceName = sPliceLayout[i][j][section]
        let sPliceSection = sPliceSectionList[sPliceName];
        if (sPliceSection) {
          let sectionPoint = sectionPointDict[gridkey].forward;
          let sectionID = sectionPoint.input.wuf.toFixed(0)
          +sectionPoint.input.wlf.toFixed(0)
          +sectionPoint.input.tlf.toFixed(0)
          +sectionPoint.input.tuf.toFixed(0)
          +sectionPoint.input.tw.toFixed(0);
          if (spFnV2[sPliceName]) {
            let dia = spFnV2[sPliceName](sectionPoint, gridPointDict[gridkey], sPliceSection, gridkey, sPliceName)
            result["children"].push(...dia.children)
  
            sectionID 
            dia.parent[0].id = sectionID + dia.parent[0].id;
            result["parent"].push(...dia.parent)
            // result[gridkey]["id"] = sPliceName +
            //   sectionPoint.web[0][0].x.toFixed(0) + sectionPoint.web[0][0].y.toFixed(0) +
            //   sectionPoint.web[0][1].x.toFixed(0) + sectionPoint.web[0][1].y.toFixed(0) +
            //   sectionPoint.web[1][0].x.toFixed(0) + sectionPoint.web[1][0].y.toFixed(0) +
            //   sectionPoint.web[1][1].x.toFixed(0) + sectionPoint.web[1][1].y.toFixed(0)
            // result[gridkey]["point"] = gridPointDict[gridkey]
          }
        }
      }
  
    }
    return result;
  }

  const spFnV2 = {
    "현장이음1": function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) { return SplicePlateGenV2(sectionPoint, gridPoint, spSection, gridKey, sPliceName) },
    "현장이음2": function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) { return SplicePlateGenV2(sectionPoint, gridPoint, spSection, gridKey, sPliceName) },
    "현장이음3": function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) { return SplicePlateGenV2(sectionPoint, gridPoint, spSection, gridKey, sPliceName) },
    "현장이음4": function (sectionPoint, gridPoint, spSection, gridKey, sPliceName) { return SplicePlateGenV2(sectionPoint, gridPoint, spSection, gridKey, sPliceName) },
  }

  export function SplicePlateGenV2(iSectionPoint, iPoint, spliceSection, gridkey, sPliceName) { // (gridPoint, sectionPoint.forward)
    // let result = { type: "splice" }
    let result = { parent: [], children: [] };
    let upperFlangeOutter = { "nb": 0, "n": 0 };
    let upperFlangeInner = [];
    let lowerFlangeOutter = { "nb": 0, "n": 0 };
    let lowerFlangeInner = [];
  
    let webSidePoints = [];
    let webSideBoltPoints = [];
    let TopPlateModels = [];
    let BottomPlateModels = [];
    let topBoltPoints = [];
    let bottomBoltPoints = [];
  
    let web = { "nb": 0 };
    let sp = { //sectionPoint변수
      webThickness: iSectionPoint.input.tw,
      uflangeWidth: iSectionPoint.input.wuf,
      lflangeWidth: iSectionPoint.input.luf,
      uflangeThickness: iSectionPoint.input.tuf,
      lflangeThickness: iSectionPoint.input.tlf,
      webJointHeight: iSectionPoint.input.H - 100
      // UribThickness: iSectionPoint.input.Urib.thickness,
      // lribThickness: iSectionPoint.input.Lrib.thickness,
    }
    //margin2 : 플랜지 이음판의 종방향 부재(종리브, 웹)와의 이격거리
    // let spliceSection = {
    //   "webJointThickness": 20,
    //   "webJointWidth": 600,
    //   "uflangeJointThickness": 20,
    //   "lflangeJointThickness": 20,
    //   "uflangeJointLength": 600,
    //   "lflangeJointLength": 600,
    //   "margin2": 20, 
    //   "uRibJointHeight" : 110, 
    //   "uRibJointLength" : 600,
    //   "uRibJointThickness" : 10,
    //   "lRibJointHeight" : 110, 
    //   "lRibJointLength" : 600,
    //   "lRibJointThickness" : 10, 
    //   "webBoltPitch" : 100,
    //   "webBoltGauge" : 100,
    //   "webBoltDia" : 22,
    //   "flangeBoltPitch" : 75,
    //   "flangeBoltGauge" : 75,
    //   "flangeBoltDia" : 22
    // }
  
    let wBolt = {
      P: spliceSection.webBoltPitch,
      G: spliceSection.webBoltGauge,
      size: 37, //향후 볼트 데이터베이스 구축해서 자동으로 입력
      dia: spliceSection.webBoltDia,
      t: 14,
    }
  
    let fBolt = {
      P: spliceSection.flangeBoltPitch,
      G: spliceSection.flangeBoltGauge,
      size: 37,
      dia: spliceSection.flangeBoltDia,
      t: 14,
    }
    let gradient = (iSectionPoint.web[1][1].y - iSectionPoint.web[0][1].y) / (iSectionPoint.web[1][1].x - iSectionPoint.web[0][1].x);
    let WebPlate = [{ x: -sp.webJointHeight / 2, y: - spliceSection.webJointWidth / 2 },
    { x: -sp.webJointHeight / 2, y: spliceSection.webJointWidth / 2 },
    { x: sp.webJointHeight / 2, y: spliceSection.webJointWidth / 2 },
    { x: sp.webJointHeight / 2, y: - spliceSection.webJointWidth / 2 }];
    let WebBolt = {
      P: wBolt.P, G: wBolt.G, size: wBolt.size, dia: wBolt.dia, t: wBolt.t, l: spliceSection.webJointThickness * 2 + sp.webThickness,
      layout: BoltLayout(wBolt.G, wBolt.P, "x", WebPlate), isUpper: true
    };
    let BoltInfo = {}
    BoltInfo["web"] = BoltLayoutInfo(wBolt.G, wBolt.P, "x", WebPlate, spliceSection.webJointThickness);
    web["b"] = sp.webJointHeight;
    web["h"] = spliceSection.webJointWidth;
    web["t"] = spliceSection.webJointThickness;
    let iNode = [iSectionPoint.web[0][0], iSectionPoint.web[1][0]];
    let jNode = [iSectionPoint.web[0][1], iSectionPoint.web[1][1]];
    let lcp = { x: (iNode[0].x + jNode[0].x) / 2, y: (iNode[0].y + jNode[0].y) / 2 };
    let rcp = { x: (iNode[1].x + jNode[1].x) / 2, y: (iNode[1].y + jNode[1].y) / 2 };
    let cp = - gradient / 2 * lcp.x + lcp.y;
    for (let i = 0; i < 2; i++) {
      // let iNode = iSectionPoint.web[i][0]
      // let jNode = iSectionPoint.web[i][1]
      let centerPoint = i === 0 ? ToGlobalPoint(iPoint, lcp) : ToGlobalPoint(iPoint, rcp)
      let lWebAngle = Math.PI - Math.atan((jNode[i].y - iNode[i].y) / (jNode[i].x - iNode[i].x))
      let partName = "webJoint";
      let side2D = i === 1 ? (cp - rcp.y) : false;
      // result[partName + (i * 2 + 1).toString()] = hPlateGenV2(Web, centerPoint, spliceSection.webJointThickness, sp.webThickness, 90, 0, lWebAngle, null, false, side2D)
      let webModel = hPlateGenV2(WebPlate, centerPoint, spliceSection.webJointThickness, sp.webThickness, 90, 0, lWebAngle, null, false, side2D)
      
      if (side2D || side2D === 0) {
        webSidePoints = webModel["model"]["sideView"]
        webSideBoltPoints.push(...boltSidePoints(WebBolt, centerPoint, lWebAngle, side2D));
      }
  
      result["children"].push(
        {
          ...webModel,
          meta: { part: gridkey, key: partName + (i * 2 + 1).toString() },
          properties: {},
          weld: {},
          textLabel: {},
          dimension: {},
        }
      )
      // result[partName + (i * 2 + 1).toString()].bolt = WebBolt;
      // result[partName + (i * 2 + 1).toString() + "bolt"] = {
      let model = i === 1 ? { sideView: boltSideView(WebBolt, centerPoint, lWebAngle, side2D) } : {};
  
      result["children"].push({
        type: "bolt",
        meta: { part: gridkey, key: partName + (i * 2 + 1).toString() + "bolt" },
        bolt: WebBolt,
        Thickness: spliceSection.webJointThickness,
        zPosition: sp.webThickness,
        rotationY: lWebAngle,
        rotationX: 0,
        point: centerPoint,
        model: model,
        get threeFunc() {
          return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
        }
      })
      // result[partName + (i * 2 + 2).toString()] = hPlateGenV2(Web, centerPoint, spliceSection.webJointThickness, - spliceSection.webJointThickness, 90, 0, lWebAngle, null, false, false)
      result["children"].push(
        {
          ...hPlateGenV2(WebPlate, centerPoint, spliceSection.webJointThickness, - spliceSection.webJointThickness, 90, 0, lWebAngle, null, false, false),
          meta: { part: gridkey, key: partName + (i * 2 + 2).toString() },
          properties: {},
          weld: {},
          textLabel: {},
          dimension: {},
        }
      )
    }
  
    let uPoint = { x: 0, y: - iSectionPoint.web[0][1].x * gradient + iSectionPoint.web[0][1].y };
    let centerPoint = ToGlobalPoint(iPoint, uPoint)
  
    if (iSectionPoint.uflange[2].length > 0) { //폐합
      let lx1 = Math.sqrt((iSectionPoint.web[0][1].x - uPoint.x) ** 2 + (iSectionPoint.web[0][1].y - uPoint.y) ** 2)
      let lx2 = Math.sqrt((iSectionPoint.web[1][1].x - uPoint.x) ** 2 + (iSectionPoint.web[1][1].y - uPoint.y) ** 2)
      let sec = (lx1 + lx2) / (iSectionPoint.web[1][1].x - iSectionPoint.web[0][1].x)
      let TopFlange = [{ x: (-lx1 - iSectionPoint.input.buf), y: -spliceSection.uflangeJointLength / 2 },
      { x: (-lx1 - iSectionPoint.input.buf), y: spliceSection.uflangeJointLength / 2 },
      { x: (lx2 + iSectionPoint.input.buf), y: spliceSection.uflangeJointLength / 2 },
      { x: (lx2 + iSectionPoint.input.buf), y: -spliceSection.uflangeJointLength / 2 },]
      let side2D = [0, 1];
      let keyName = "cTop";
      // result[keyName] = hPlateGenV2(TopFlange, centerPoint, spliceSection.uflangeJointThickness, sp.uflangeThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, true, side2D, false)
      result["children"].push(
        {
          ...hPlateGenV2SideView(TopFlange, centerPoint, spliceSection.uflangeJointThickness, sp.uflangeThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, true, side2D, false),
          meta: { part: gridkey, key: keyName },
          properties: {},
          weld: {},
          textLabel: {},
          dimension: {},
        }
      )
      upperFlangeOutter["b"] = Math.abs(TopFlange[0].x - TopFlange[2].x);
      upperFlangeOutter["h"] = Math.abs(TopFlange[0].y - TopFlange[2].y);
      upperFlangeOutter["t"] = spliceSection.uflangeJointThickness;
  
  
      let xList = [-lx1 - iSectionPoint.input.buf, -lx1 - sp.webThickness - spliceSection.margin2,
      -lx1 + spliceSection.margin2];
      let uRibJoint = [{ y: - spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height }, { y: spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height },
      { y: spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height - spliceSection.uRibJointHeight }, { y: -spliceSection.uRibJointLength / 2, x: iSectionPoint.input.Urib.height - spliceSection.uRibJointHeight }]
      for (let i in iSectionPoint.input.Urib.layout) {
        let uRibPoint = ToGlobalPoint(iPoint, { x: iSectionPoint.input.Urib.layout[i], y: uPoint.y + gradient * iSectionPoint.input.Urib.layout[i] })
        // result["uRibJoint" + (i * 2 + 1).toString()] = hPlateGenV2(uRibJoint, uRibPoint, spliceSection.uRibJointThickness, iSectionPoint.input.Urib.thickness / 2, 90, Math.atan(iPoint.gradientX), Math.PI / 2, null, false)
        result["children"].push(
          {
            ...hPlateGenV2(uRibJoint, uRibPoint, spliceSection.uRibJointThickness, iSectionPoint.input.Urib.thickness / 2, 90, Math.atan(iPoint.gradientX), Math.PI / 2, null, false),
            meta: { part: gridkey, key: "uRibJoint" + (i * 2 + 1).toString() },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
        let uRibBolt = {
          P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: 2 * spliceSection.uRibJointThickness + iSectionPoint.input.Urib.thickness,
          layout: BoltLayout(fBolt.G, fBolt.P, "x", uRibJoint), isUpper: true
        }
        // result["uRibJoint" + (i * 2 + 1).toString()].bolt = uRibBolt;
        // result["uRibJoint" + (i * 2 + 1).toString() + "bolt"] = {
        result["children"].push({
          type: "bolt",
          meta: { part: gridkey, key: "uRibJoint" + (i * 2 + 1).toString() + "bolt" },
          bolt: uRibBolt,
          Thickness: spliceSection.uRibJointThickness,
          zPosition: iSectionPoint.input.Urib.thickness / 2,
          rotationY: Math.PI / 2,
          rotationX: Math.atan(iPoint.gradientX),
          point: uRibPoint,
          get threeFunc() {
            return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
          }
        })
        // result["uRibJoint" + (i * 2 + 2).toString()] = hPlateGenV2(uRibJoint, uRibPoint, spliceSection.uRibJointThickness, -spliceSection.uRibJointThickness - iSectionPoint.input.Urib.thickness / 2, 90, Math.atan(iPoint.gradientX), Math.PI / 2, null, false)
        result["children"].push(
          {
            ...hPlateGenV2(uRibJoint, uRibPoint, spliceSection.uRibJointThickness, -spliceSection.uRibJointThickness - iSectionPoint.input.Urib.thickness / 2, 90, Math.atan(iPoint.gradientX), Math.PI / 2, null, false),
            meta: { part: gridkey, key: "uRibJoint" + (i * 2 + 2).toString() },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
        xList.push((iSectionPoint.input.Urib.layout[i] - iSectionPoint.input.Urib.thickness / 2) * sec - spliceSection.margin2);
        xList.push((iSectionPoint.input.Urib.layout[i] + iSectionPoint.input.Urib.thickness / 2) * sec + spliceSection.margin2)
      }
      xList.push(lx2 - spliceSection.margin2, lx2 + sp.webThickness + spliceSection.margin2, lx2 + iSectionPoint.input.buf);
      for (let i = 0; i < xList.length; i += 2) {
        keyName = "cTopI" + i;
        let TopFlange2 = [{ x: xList[i], y: -spliceSection.uflangeJointLength / 2 }, { x: xList[i], y: spliceSection.uflangeJointLength / 2 },
        { x: xList[i + 1], y: spliceSection.uflangeJointLength / 2 }, { x: xList[i + 1], y: -spliceSection.uflangeJointLength / 2 }]
        side2D = i === 0 ? [0, 1] : null;
        // result[keyName] = hPlateGenV2(TopFlange2, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, side2D, false)
        let model = hPlateGenV2SideView(TopFlange2, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, side2D, false)
        TopPlateModels.push(model)
        result["children"].push(
          {
            ...model,
            meta: { part: gridkey, key: keyName },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
  
        let topBolt = {
          P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
          layout: BoltLayout(fBolt.G, fBolt.P, "x", TopFlange2), isUpper: false, isTop: true,
        }
        BoltInfo[keyName + "bolt"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", TopFlange2, spliceSection.uflangeJointThickness);
        // result[keyName].bolt = topBolt;
        // result[keyName + "bolt"] = {
        topBoltPoints.push(boltPlanPoints(topBolt, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)))
        result["children"].push({
          type: "bolt",
          meta: { part: gridkey, key: keyName + "bolt" },
          bolt: topBolt,
          Thickness: spliceSection.uflangeJointThickness,
          zPosition: - spliceSection.uflangeJointThickness,
          rotationY: -Math.atan(gradient),
          rotationX: Math.atan(iPoint.gradientX),
          point: centerPoint,
          model: { topView: boltPlanView(topBolt, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)) },
          get threeFunc() {
            return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
          }
        })
      }
    } else { // 개구
      for (let i = 0; i < 2; i++) {
        let lx = Math.sqrt((iSectionPoint.web[i][1].x - uPoint.x) ** 2 + (iSectionPoint.web[i][1].y - uPoint.y) ** 2)
        let sign = i === 0 ? -1 : 1;
        let TopFlange = [{ x: sign * (lx + iSectionPoint.input.buf), y: -spliceSection.uflangeJointLength / 2 }, { x: sign * (lx + iSectionPoint.input.buf), y: spliceSection.uflangeJointLength / 2 },
        { x: sign * (lx + iSectionPoint.input.buf - iSectionPoint.input.wuf), y: spliceSection.uflangeJointLength / 2 }, { x: sign * (lx + iSectionPoint.input.buf - iSectionPoint.input.wuf), y: - spliceSection.uflangeJointLength / 2 }]
  
        let keyName = i === 0 ? "lTop" : "rTop";
        let side2D = i === 0 ? [0, 1] : null;
        // result[keyName] = hPlateGenV2(TopFlange, centerPoint, spliceSection.uflangeJointThickness, sp.uflangeThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, true, side2D, false)
        result["children"].push(
          {
            ...hPlateGenV2SideView(TopFlange, centerPoint, spliceSection.uflangeJointThickness, sp.uflangeThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, true, side2D, false),
            meta: { part: gridkey, key: keyName },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
        if (i === 0) {
          upperFlangeOutter["b"] = Math.abs(TopFlange[0].x - TopFlange[2].x);
          upperFlangeOutter["h"] = Math.abs(TopFlange[0].y - TopFlange[2].y);
          upperFlangeOutter["t"] = spliceSection.uflangeJointThickness;
        }
  
        let TopFlange2 = [{ x: sign * (lx + iSectionPoint.input.buf), y: -spliceSection.uflangeJointLength / 2 }, { x: sign * (lx + iSectionPoint.input.buf), y: spliceSection.uflangeJointLength / 2 },
        { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: spliceSection.uflangeJointLength / 2 }, { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: - spliceSection.uflangeJointLength / 2 }]
        let TopFlange3 = [{ x: sign * (lx - spliceSection.margin2), y: -spliceSection.uflangeJointLength / 2 }, { x: sign * (lx - spliceSection.margin2), y: spliceSection.uflangeJointLength / 2 },
        { x: sign * (lx + iSectionPoint.input.buf - iSectionPoint.input.wuf), y: spliceSection.uflangeJointLength / 2 }, { x: sign * (lx + iSectionPoint.input.buf - iSectionPoint.input.wuf), y: - spliceSection.uflangeJointLength / 2 }]
  
        // result[keyName + "2"] = hPlateGenV2(TopFlange2, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, side2D, false)
        let model2 = hPlateGenV2SideView(TopFlange2, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, side2D, false)
        TopPlateModels.push(model2)
        result["children"].push(
          {
            ...model2,
            meta: { part: gridkey, key: keyName + "2" },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
  
        let topBolt2 = {
          P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
          layout: BoltLayout(fBolt.G, fBolt.P, "x", TopFlange2), isUpper: false, isTop: true,
        }
        // result[keyName + "2"].bolt = topBolt2;
        // result[keyName + "bolt2"] = {
        BoltInfo[keyName + "bolt2"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", TopFlange2, spliceSection.uflangeJointThickness);
        topBoltPoints.push(boltPlanPoints(topBolt2, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)))
        result["children"].push({
          type: "bolt",
          meta: { part: gridkey, key: keyName + "bolt2" },
          bolt: topBolt2,
          Thickness: spliceSection.uflangeJointThickness,
          zPosition: - spliceSection.uflangeJointThickness,
          rotationY: -Math.atan(gradient),
          rotationX: Math.atan(iPoint.gradientX),
          point: centerPoint,
          model: { topView: boltPlanView(topBolt2, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)) },
          get threeFunc() {
            return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
          }
        })
        // result[keyName + "3"] = hPlateGenV2(TopFlange3, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, null, false)
        let model3 = hPlateGenV2SideView(TopFlange3, centerPoint, spliceSection.uflangeJointThickness, - spliceSection.uflangeJointThickness, 90, Math.atan(iPoint.gradientX), -Math.atan(gradient), null, false, null, false)
        TopPlateModels.push(model3)
        result["children"].push(
          {
            ...model3,
            meta: { part: gridkey, key: keyName + "3" },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
        let topBolt3 = {
          P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: 2 * spliceSection.uflangeJointThickness + sp.uflangeThickness,
          layout: BoltLayout(fBolt.G, fBolt.P, "x", TopFlange3), isUpper: false, isTop: true,
        }
        BoltInfo[keyName + "bolt3"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", TopFlange3, spliceSection.uflangeJointThickness);
        // result[keyName + "3"].bolt = topBolt3;
        // result[keyName + "bolt3"] = {
        topBoltPoints.push(boltPlanPoints(topBolt3, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)))
        result["children"].push({
          type: "bolt",
          meta: { part: gridkey, key: keyName + "bolt3" },
          bolt: topBolt3,
          Thickness: spliceSection.uflangeJointThickness,
          zPosition: - spliceSection.uflangeJointThickness,
          rotationY: -Math.atan(gradient),
          rotationX: Math.atan(iPoint.gradientX),
          point: centerPoint,
          model: { topView: boltPlanView(topBolt3, centerPoint, Math.atan(iPoint.gradientX), -Math.atan(gradient)) },
          get threeFunc() {
            return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
          }
        })
      }
    }
  
    let lPoint = { x: 0, y: iSectionPoint.web[0][0].y };
    centerPoint = ToGlobalPoint(iPoint, lPoint)
    // let BottomFlangeBolt = {
    //   P: fBolt.P, G: fBolt.G, pNum: fBolt.pNum, gNum: fBolt.gNum, size: fBolt.size, t: fBolt.t, l: 2 * xs.lflangeJointThickness + sp.lflangeThickness,
    //   spliceAxis: "x", isUpper: true
    // }
    let bXRad = Math.atan(iPoint.gradientX + iSectionPoint.input.gradientlf)
    // console.log("check", bXRad)
  
    if (iSectionPoint.lflange[2].length > 0) { //폐합
      let lx1 = Math.sqrt((iSectionPoint.web[0][0].x - lPoint.x) ** 2 + (iSectionPoint.web[0][0].y - lPoint.y) ** 2)
      let lx2 = Math.sqrt((iSectionPoint.web[1][0].x - lPoint.x) ** 2 + (iSectionPoint.web[1][0].y - lPoint.y) ** 2)
      let sec = 1 // (lx1 + lx2) / (iSectionPoint.web[1][1].x - iSectionPoint.web[0][1].x) //제형단면의 경우 종리브가 깊이에 비례해서 간격이 바뀔경우를 고려
      let BottomFlange = [{ x: (-lx1 - iSectionPoint.input.blf), y: -spliceSection.lflangeJointLength / 2 },
      { x: (-lx1 - iSectionPoint.input.blf), y: spliceSection.lflangeJointLength / 2 },
      { x: (lx2 + iSectionPoint.input.blf), y: spliceSection.uflangeJointLength / 2 },
      { x: (lx2 + iSectionPoint.input.blf), y: -spliceSection.uflangeJointLength / 2 },]
      let side2D = [0, 1];
      let keyName = "cBottom";
      // result[keyName] = hPlateGenV2(BottomFlange, centerPoint, spliceSection.lflangeJointThickness, - sp.lflangeThickness - spliceSection.lflangeJointThickness, 90,
      //   bXRad, 0, null, false, side2D, false)
      result["children"].push(
        {
          ...hPlateGenV2(BottomFlange, centerPoint, spliceSection.lflangeJointThickness, - sp.lflangeThickness - spliceSection.lflangeJointThickness, 90,
            bXRad, 0, null, false, side2D, false),
          meta: { part: gridkey, key: keyName },
          properties: {},
          weld: {},
          textLabel: {},
          dimension: {},
        }
      )
      lowerFlangeOutter["b"] = Math.abs(BottomFlange[0].x - BottomFlange[2].x);
      lowerFlangeOutter["h"] = Math.abs(BottomFlange[0].y - BottomFlange[2].y);
      lowerFlangeOutter["t"] = spliceSection.lflangeJointThickness;
  
      let xList = [-lx1 - iSectionPoint.input.blf, -lx1 - sp.webThickness - spliceSection.margin2,
      -lx1 + spliceSection.margin2];
      let lRibJoint = [{ y: - spliceSection.lRibJointLength / 2, x: iSectionPoint.input.Lrib.height }, { y: spliceSection.lRibJointLength / 2, x: iSectionPoint.input.Lrib.height },
      { y: spliceSection.lRibJointLength / 2, x: iSectionPoint.input.Lrib.height - spliceSection.lRibJointHeight }, { y: -spliceSection.lRibJointLength / 2, x: iSectionPoint.input.Lrib.height - spliceSection.lRibJointHeight }]
  
      for (let i in iSectionPoint.input.Lrib.layout) {
        let lRibPoint = ToGlobalPoint(iPoint, { x: iSectionPoint.input.Lrib.layout[i], y: lPoint.y })
        // result["lRibJoint" + (i * 2 + 1).toString()] = hPlateGenV2(lRibJoint, lRibPoint, spliceSection.lRibJointThickness, iSectionPoint.input.Lrib.thickness / 2, 90, bXRad, -Math.PI / 2, null, false)
        result["children"].push(
          {
            ...hPlateGenV2(lRibJoint, lRibPoint, spliceSection.lRibJointThickness, iSectionPoint.input.Lrib.thickness / 2, 90, bXRad, -Math.PI / 2, null, false),
            meta: { part: gridkey, key: "lRibJoint" + (i * 2 + 1).toString() },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
  
  
        let lRibBolt = {
          P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: 2 * spliceSection.lRibJointThickness + iSectionPoint.input.Lrib.thickness,
          layout: BoltLayout(fBolt.G, fBolt.P, "x", lRibJoint), isUpper: true
        }
        // result["lRibJoint" + (i * 2 + 1).toString()].bolt = lRibBolt;
        // result["lRibJoint" + (i * 2 + 1).toString() + "bolt"] = {
        result["children"].push({
          type: "bolt",
          meta: { part: gridkey, key: "lRibJoint" + (i * 2 + 1).toString() + "bolt" },
          bolt: lRibBolt,
          Thickness: spliceSection.lRibJointThickness,
          zPosition: iSectionPoint.input.Lrib.thickness / 2,
          rotationY: - Math.PI / 2,
          rotationX: bXRad,
          point: lRibPoint,
          get threeFunc() {
            return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
          }
        })
        // result["lRibJoint" + (i * 2 + 2).toString()] = hPlateGenV2(lRibJoint, lRibPoint, spliceSection.lRibJointThickness, -spliceSection.lRibJointThickness - iSectionPoint.input.Lrib.thickness / 2, 90, bXRad, -Math.PI / 2, null, false)
        result["children"].push(
          {
            ...hPlateGenV2(lRibJoint, lRibPoint, spliceSection.lRibJointThickness, -spliceSection.lRibJointThickness - iSectionPoint.input.Lrib.thickness / 2, 90, bXRad, -Math.PI / 2, null, false),
            meta: { part: gridkey, key: "lRibJoint" + (i * 2 + 2).toString() },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
        xList.push((iSectionPoint.input.Lrib.layout[i] - iSectionPoint.input.Lrib.thickness / 2) * sec - spliceSection.margin2);
        xList.push((iSectionPoint.input.Lrib.layout[i] + iSectionPoint.input.Lrib.thickness / 2) * sec + spliceSection.margin2)
      }
      xList.push(lx2 - spliceSection.margin2, lx2 + sp.webThickness + spliceSection.margin2, lx2 + iSectionPoint.input.blf);
      for (let i = 0; i < xList.length; i += 2) {
        keyName = "cBottomI" + i;
        let BottomFlange2 = [{ x: xList[i], y: -spliceSection.lflangeJointLength / 2 }, { x: xList[i], y: spliceSection.lflangeJointLength / 2 },
        { x: xList[i + 1], y: spliceSection.lflangeJointLength / 2 }, { x: xList[i + 1], y: -spliceSection.lflangeJointLength / 2 }]
        side2D = i === 0 ? [0, 1] : null;
        // result[keyName] = hPlateGenV2(BottomFlange2, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, side2D, true)
        let model = hPlateGenV2SideView(BottomFlange2, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, side2D, true);
        BottomPlateModels.push(model);
        result["children"].push(
          {
            ...model,
            meta: { part: gridkey, key: keyName },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
  
  
  
        let bottomBolt = {
          P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
          layout: BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2), isUpper: true, isTop: false,
        }
        BoltInfo[keyName + "bolt"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", BottomFlange2, spliceSection.lflangeJointThickness);
        // result[keyName].bolt = bottomBolt;
        bottomBoltPoints.push(boltPlanPoints(bottomBolt, centerPoint, bXRad, 0))
        result["children"].push({
          type: "bolt",
          meta: { part: gridkey, key: keyName + "bolt" },
          bolt: bottomBolt,
          Thickness: spliceSection.lflangeJointThickness,
          zPosition: 0,
          rotationY: 0,
          rotationX: bXRad,
          point: centerPoint,
          model: { bottomView: boltPlanView(bottomBolt, centerPoint, bXRad, 0) },
          get threeFunc() {
            return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
          }
        })
      }
    } else { // 개구
      for (let i = 0; i < 2; i++) {
        let lx = Math.sqrt((iSectionPoint.web[i][0].x - lPoint.x) ** 2 + (iSectionPoint.web[i][0].y - lPoint.y) ** 2)
        let sign = i === 0 ? -1 : 1;
        let BottomFlange = [{ x: sign * (lx + iSectionPoint.input.blf), y: -spliceSection.lflangeJointLength / 2 }, { x: sign * (lx + iSectionPoint.input.blf), y: spliceSection.lflangeJointLength / 2 },
        { x: sign * (lx + iSectionPoint.input.blf - iSectionPoint.input.wlf), y: spliceSection.lflangeJointLength / 2 }, { x: sign * (lx + iSectionPoint.input.blf - iSectionPoint.input.wlf), y: - spliceSection.lflangeJointLength / 2 }]
        let keyName = i === 0 ? "lBottom" : "rBottom";
        let side2D = i === 0 ? [0, 1] : null;
        // result[keyName] = hPlateGenV2(BottomFlange, centerPoint, spliceSection.lflangeJointThickness, - sp.lflangeThickness - spliceSection.lflangeJointThickness, 90, bXRad, 0, null, false, side2D)
        result["children"].push(
          {
            ...hPlateGenV2SideView(BottomFlange, centerPoint, spliceSection.lflangeJointThickness, - sp.lflangeThickness - spliceSection.lflangeJointThickness, 90, bXRad, 0, null, false, side2D),
            meta: { part: gridkey, key: keyName },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
        if (i === 0) {
          lowerFlangeOutter["b"] = Math.abs(BottomFlange[0].x - BottomFlange[2].x);
          lowerFlangeOutter["h"] = Math.abs(BottomFlange[0].y - BottomFlange[2].y);
          lowerFlangeOutter["t"] = spliceSection.lflangeJointThickness;
        }
        let BottomFlange2 = [{ x: sign * (lx + iSectionPoint.input.blf), y: -spliceSection.lflangeJointLength / 2 }, { x: sign * (lx + iSectionPoint.input.blf), y: spliceSection.lflangeJointLength / 2 },
        { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: spliceSection.lflangeJointLength / 2 }, { x: sign * (lx + sp.webThickness + spliceSection.margin2), y: - spliceSection.lflangeJointLength / 2 }]
        let BottomFlange3 = [{ x: sign * (lx - spliceSection.margin2), y: -spliceSection.lflangeJointLength / 2 }, { x: sign * (lx - spliceSection.margin2), y: spliceSection.lflangeJointLength / 2 },
        { x: sign * (lx + iSectionPoint.input.blf - iSectionPoint.input.wlf), y: spliceSection.lflangeJointLength / 2 }, { x: sign * (lx + iSectionPoint.input.blf - iSectionPoint.input.wlf), y: - spliceSection.lflangeJointLength / 2 }]
        // result[keyName + "2"] = hPlateGenV2(BottomFlange2, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, side2D, true)
        let model2 = hPlateGenV2SideView(BottomFlange2, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, side2D, true)
        BottomPlateModels.push(model2);
        result["children"].push(
          {
            ...model2,
            meta: { part: gridkey, key: keyName + "2" },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
  
        let bottomBolt2 = {
          P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
          layout: BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange2), isUpper: true, isTop: false,
        };
        BoltInfo[keyName + "bolt2"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", BottomFlange2, spliceSection.lflangeJointThickness);
        // result[keyName + "2"].bolt = bottomBolt2
        bottomBoltPoints.push(boltPlanPoints(bottomBolt2, centerPoint, bXRad, 0))
        result["children"].push({
          type: "bolt",
          meta: { part: gridkey, key: keyName + "bolt2" },
          bolt: bottomBolt2,
          Thickness: spliceSection.lflangeJointThickness,
          zPosition: 0,
          rotationY: 0,
          rotationX: bXRad,
          point: centerPoint,
          model: { bottomView: boltPlanView(bottomBolt2, centerPoint, bXRad, 0) },
          get threeFunc() {
            return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
          }
        })
        // result[keyName + "3"] = hPlateGenV2(BottomFlange3, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, null, true)
        let model3 = hPlateGenV2SideView(BottomFlange3, centerPoint, spliceSection.lflangeJointThickness, 0, 90, bXRad, 0, null, false, null, true);
        BottomPlateModels.push(model3);
        result["children"].push(
          {
            ...model3,
            meta: { part: gridkey, key: keyName + "3" },
            properties: {},
            weld: {},
            textLabel: {},
            dimension: {},
          }
        )
        let bottomBolt3 = {
          P: fBolt.P, G: fBolt.G, size: fBolt.size, dia: fBolt.dia, t: fBolt.t, l: 2 * spliceSection.lflangeJointThickness + sp.lflangeThickness,
          layout: BoltLayout(fBolt.G, fBolt.P, "x", BottomFlange3), isUpper: true, isTop: false,
        };
        BoltInfo[keyName + "bolt"] = BoltLayoutInfo(fBolt.G, fBolt.P, "x", BottomFlange3, spliceSection.lflangeJointThickness);
        // result[keyName + "3"].bolt = bottomBolt3
        bottomBoltPoints.push(boltPlanPoints(bottomBolt3, centerPoint, bXRad, 0))
        result["children"].push({
          type: "bolt",
          meta: { part: gridkey, key: keyName + "bolt3" },
          bolt: bottomBolt3,
          Thickness: spliceSection.lflangeJointThickness,
          zPosition: 0,
          rotationY: 0,
          rotationX: bXRad,
          point: centerPoint,
          model: { bottomView: boltPlanView(bottomBolt3, centerPoint, bXRad, 0) },
          get threeFunc() {
            return InitPoint => boltView2(this.Thickness, this.zPosition, this.rotationY, this.rotationX, this.point, this.bolt, InitPoint);
          }
        })
      }
    }
    for (let boltKey in BoltInfo) {
      if (boltKey.includes("Top")) {
        upperFlangeOutter["nb"] += BoltInfo[boltKey].nb;
        upperFlangeOutter["nh"] = BoltInfo[boltKey].nh;
        upperFlangeOutter["n"] += 1;
        upperFlangeOutter["s"] = 2 * spliceSection.margin2;
        upperFlangeInner.push(BoltInfo[boltKey]);
      } else if (boltKey.includes("Bottom")) {
        lowerFlangeOutter["nb"] += BoltInfo[boltKey].nb;
        lowerFlangeOutter["nh"] = BoltInfo[boltKey].nh;
        lowerFlangeOutter["n"] += 1;
        lowerFlangeOutter["s"] = 2 * spliceSection.margin2;
        lowerFlangeInner.push(BoltInfo[boltKey]);
      } else { //only web
        web = BoltInfo[boltKey];
      }
  
    }
    let dummyTopPts = [];
    let dummyTopPtsR = [];
    let dummyBottomPts = [];
    let dummyBottomPtsR = [];
    let topLeftDimPoints = []; //모델이 대칭이라 마지막 좌표가 안측에 놓이게 됨, 하부도 마찬가지
    for (let i in TopPlateModels) {
      // topLeftDimPoints.push(ToGlobalPoint2(iPoint, TopPlateModels[i]["points"][0]))
      // topLeftDimPoints.push(ToGlobalPoint2(iPoint, TopPlateModels[i]["points"][3]))
      dummyTopPts.push(TopPlateModels[i]["points"][0], TopPlateModels[i]["points"][3])
      dummyTopPtsR.push(TopPlateModels[i]["points"][1], TopPlateModels[i]["points"][2])
    }
    dummyTopPts.sort(function(a, b){ return a.x<b.x? -1 : 1 })
    dummyTopPtsR.sort(function(a, b){ return a.x<b.x? -1 : 1 })
    dummyTopPts.forEach(pt => topLeftDimPoints.push(ToGlobalPoint2(iPoint, pt)))
  
    let topRightDimPoints = [ //모델상에 마지막 좌표를 찾아야함
      ToGlobalPoint2(iPoint, dummyTopPtsR[0]),
      ToGlobalPoint2(iPoint, dummyTopPtsR[dummyTopPtsR.length-1])
    ];
    topBoltPoints.forEach(el => topRightDimPoints.push(...el))
    let bottomLeftDimPoints = [];
    for (let i in BottomPlateModels) {
      dummyBottomPts.push(BottomPlateModels[i]["points"][0], BottomPlateModels[i]["points"][3])
      dummyBottomPtsR.push(BottomPlateModels[i]["points"][1], BottomPlateModels[i]["points"][2])
      // bottomLeftDimPoints.push(BottomPlateModels[i]["model"]["bottomView"][0])
      // bottomLeftDimPoints.push(BottomPlateModels[i]["model"]["bottomView"][3])
    }
    dummyBottomPts.sort(function(a, b){ return a.x<b.x? -1 : 1 })
    dummyBottomPtsR.sort(function(a, b){ return a.x<b.x? -1 : 1 })
    dummyBottomPts.forEach(pt => bottomLeftDimPoints.push(ToGlobalPoint2(iPoint, pt)))
    
    let bottomRightDimPoints = [
      ToGlobalPoint2(iPoint, dummyBottomPtsR[0]),
      ToGlobalPoint2(iPoint, dummyBottomPtsR[dummyTopPtsR.length-1])
      // BottomPlateModels[0]["model"]["bottomView"][1],
      // BottomPlateModels[BottomPlateModels.length - 1]["model"]["bottomView"][2],
    ];
    bottomBoltPoints.forEach(el => bottomRightDimPoints.push(...el))
    let sideTopDimPoints = [
      webSidePoints[2], webSidePoints[3], ...webSideBoltPoints
    ];
    let sideBottomDimPoints = [
      webSidePoints[0], webSidePoints[1], ...webSideBoltPoints
    ];
  
    let sideLeftDimPoints = [
      webSidePoints[0], webSidePoints[3], ...webSideBoltPoints
    ];
    let sideRightDimPoints = [
      webSidePoints[1], webSidePoints[2], ...webSideBoltPoints
    ];
    let topIndex = sideTopDimPoints[0].y > sideTopDimPoints[sideTopDimPoints.length - 1].y ? true : false;
    let bottomIndex = sideBottomDimPoints[0].y < sideBottomDimPoints[sideBottomDimPoints.length - 1].y ? true : false;
  
  
    result["parent"].push(
      {
        "part": gridkey,
        "id": sPliceName +
          iSectionPoint.web[0][0].x.toFixed(0) + iSectionPoint.web[0][0].y.toFixed(0) +
          iSectionPoint.web[0][1].x.toFixed(0) + iSectionPoint.web[0][1].y.toFixed(0) +
          iSectionPoint.web[1][0].x.toFixed(0) + iSectionPoint.web[1][0].y.toFixed(0) +
          iSectionPoint.web[1][1].x.toFixed(0) + iSectionPoint.web[1][1].y.toFixed(0) +
          (iSectionPoint.input.isSeparated ? "P" : "B"),
        "point": iPoint,
        //계산서 변수 추가 필요
        "sectionName": sPliceName,
        "shape": iSectionPoint.input.isSeparated ? "plate" : "box",
        "properties": {
          upperFlangeOutter,
          upperFlangeInner,
          lowerFlangeOutter,
          lowerFlangeInner,
          web,
          bolt: { name: "F13T", D: spliceSection.webBoltDia }
        },
        dimension: {
          sideView: [
            { type: "DIMALIGN", points: [sideTopDimPoints[0], sideTopDimPoints[1]], index: 0, isHorizontal: true, isTopOrRight: true, offsetIndex: 2 },
            { type: "DIMALIGN", points: sideTopDimPoints, index: topIndex ? 0 : sideTopDimPoints.length - 1, isHorizontal: true, isTopOrRight: true, offsetIndex: 1 },
            { type: "DIMALIGN", points: [sideBottomDimPoints[0], sideBottomDimPoints[1]], index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 2 },
            { type: "DIMALIGN", points: sideBottomDimPoints, index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 1 },
            { type: "DIMALIGN", points: [sideLeftDimPoints[0], sideLeftDimPoints[1]], index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
            { type: "DIMALIGN", points: sideLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
            { type: "DIMALIGN", points: sideRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            { type: "DIMALIGN", points: [sideRightDimPoints[0], sideRightDimPoints[1]], index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 4 },
          ],
          topView: [
            { type: "DIMALIGN", points: [topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]], index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 5 },
            { type: "DIMALIGN", points: topLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
            { type: "DIMALIGN", points: [topRightDimPoints[0], topRightDimPoints[1]], index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 4 },
            { type: "DIMALIGN", points: topRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
          ],
          bottomView: [
            { type: "DIMALIGN", points: [bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]], index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 5 },
            { type: "DIMALIGN", points: bottomLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
            { type: "DIMALIGN", points: [bottomRightDimPoints[0], bottomRightDimPoints[1]], index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 4 },
            { type: "DIMALIGN", points: bottomRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
          ]
        }
      })
  
  
    return result
  }