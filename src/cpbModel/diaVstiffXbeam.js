import { Extrude, GetArcPoints, GetArcPoints2D, PointToGlobal, PointToSkewedGlobal, RefPoint } from "@nexivil/package-modules";
import { scallop, toRefPoint } from "@nexivil/package-modules/src/temp";
import { THREE } from 'global'

export function vPlateGenV2(points, centerPoint, scallopVertex, scallopR, urib, lrib) {
    let skew = centerPoint.skew;
  
    const bl = points[0];
    const br = points[1];
    const tl = points[3];
    const tr = points[2];
  
    const gradient = (tr.y - tl.y) / (tr.x - tl.x)
    const gradient2 = (br.y - bl.y) / (br.x - bl.x)
    const cosec = 1 / Math.cos(skew);
  
    let mainPlate = [];
    points.forEach(pt => mainPlate.push({ x: pt.x * cosec, y: pt.y }));
  
    let upperPoints = [];
    if (urib) {
      for (let i = 0; i < urib.layout.length; i++) {
        upperPoints.push({ x: urib.layout[i] * cosec - urib.ribHoleD, y: tl.y + gradient * (urib.layout[i] - urib.ribHoleD - tl.x) });
        let curve = new THREE.ArcCurve(urib.layout[i] * cosec, tl.y + gradient * (urib.layout[i] - tl.x) - urib.height, urib.ribHoleR, Math.PI, 0, false);
        let dummyVectors = curve.getPoints(8)
        for (let i = 0; i < dummyVectors.length; i++) {
          upperPoints.push({ x: dummyVectors[i].x, y: dummyVectors[i].y })
        }
        upperPoints.push({ x: urib.layout[i] * cosec + urib.ribHoleD, y: tl.y + gradient * (urib.layout[i] + urib.ribHoleD - tl.x) });
      }
    }
    let lowerPoints = [];
    if (lrib) {
      if (lrib.type == 0) {
        for (let i = 0; i < lrib.layout.length; i++) {
          lowerPoints.push({ x: lrib.layout[i] * cosec - lrib.ribHoleD, y: bl.y + gradient2 * (lrib.layout[i] - lrib.ribHoleD - bl.x) });
          let curve = new THREE.ArcCurve(lrib.layout[i] * cosec, bl.y + gradient2 * (lrib.layout[i] - bl.x) + lrib.height, lrib.ribHoleR, Math.PI, 0, true);
          let dummyVectors = curve.getPoints(8)
          for (let i = 0; i < dummyVectors.length; i++) {
            lowerPoints.push({ x: dummyVectors[i].x, y: dummyVectors[i].y })
          }
          lowerPoints.push({ x: lrib.layout[i] * cosec + lrib.ribHoleD, y: bl.y + gradient2 * (lrib.layout[i] + lrib.ribHoleD - bl.x) });
        }
      } else if (lrib.type === 1) {
        for (let i = 0; i < lrib.layout.length; i++) {
          let dummyPoints = [];
          dummyPoints.push({ x: lrib.layout[i] * cosec - lrib.thickness / 2 - 1, y: bl.y + gradient2 * (lrib.layout[i] - lrib.thickness / 2 - 1 - bl.x) },
            { x: lrib.layout[i] * cosec - lrib.thickness / 2 - 1, y: bl.y + gradient2 * (lrib.layout[i] - bl.x) + lrib.height + 1 },
            { x: lrib.layout[i] * cosec + lrib.thickness / 2 + 1, y: bl.y + gradient2 * (lrib.layout[i] - bl.x) + lrib.height + 1 },
            { x: lrib.layout[i] * cosec + lrib.thickness / 2 + 1, y: bl.y + gradient2 * (lrib.layout[i] + lrib.thickness / 2 + 1 - bl.x) })
          lowerPoints.push(...scallop(bl, dummyPoints[0], dummyPoints[1], 10, 1));
          lowerPoints.push(dummyPoints[1], dummyPoints[2]);
          lowerPoints.push(...scallop(dummyPoints[2], dummyPoints[3], br, 10, 1));
        }
      }
    }
    let resultPoints = [];
    for (let i = 0; i < points.length; i++) {
      if (scallopVertex.includes(i)) {
        let former = i === 0 ? mainPlate.length - 1 : i - 1;
        let latter = i === mainPlate.length - 1 ? 0 : i + 1;
        resultPoints.push(...scallop(mainPlate[former], mainPlate[i], mainPlate[latter], scallopR, 4));
      } else {
        resultPoints.push(mainPlate[i])
      }
      if (i === 0) {
        resultPoints.push(...lowerPoints);
      } else if (i === 2) {
        resultPoints.push(...upperPoints.reverse());
      }
    }
    return resultPoints
  }


export function DiaShapeDictV2(stPointDict, sectionPointDict, diaphragmLayout, diaphragmSectionList, sectionDB) {
    // const position = 0;
    const section = 2;
    let result = { parent: [], children: [] };
    let xbeamData = [];
    // let idSet = new Set

    for (let i = 0; i < diaphragmLayout.length; i++) {
        for (let j = 0; j < diaphragmLayout[i].length; j++) {
            // let xbData;
            // let xbSection;
            let gridkey = "G" + (i + 1).toFixed(0) + "D" + (j + 1).toFixed(0); // iaphragmLayout[i][position];
            let diaSectionName = diaphragmLayout[i][j][section];
            let diaSection = diaphragmSectionList[diaSectionName];
            let xbData;
            let xbSection;
            if (diaFnV2[diaSectionName]) {
                let sectionPoint = sectionPointDict[gridkey].forward;
                let dia = diaFnV2[diaSectionName](sectionPoint, stPointDict[gridkey], diaSection, gridkey, diaSectionName, sectionDB);
                result["children"].push(...dia.children);
                result["parent"].push(...dia.parent);
                // xbData = dia["parent"][0].data;
                // xbSection = dia["parent"][0].section;
                // if (xbData && xbSection) {
                //     xbeamData.push({
                //         inode: gridkey + "L",
                //         jnode: gridkey + "R",
                //         key: gridkey + "X",
                //         isKframe: false,
                //         data: xbData,
                //         section: xbSection,
                //     });
                // }
            }
        }
    }
    // console.log(idSet)
    return { diaDict: result, xbeamData };
}

const diaFnV2 = {
    // K형: function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName, sectionDB) {
    //     return uBoxDia1(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName, sectionDB);
    // },
    // 단부지점부: function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
    //     return boxDiaHole1(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    // },
    // 중간지점부: function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
    //     return boxDiaHole1(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    // },
    // "플레이트-하": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
    //     return DYdia0V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    // },
    // "플레이트-중": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
    //     return DYdia1V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    // },
    // // "플레이트-중-볼트": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) { return DYdia2V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) },
    // "플레이트-상-볼트": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
    //     return DYdia3V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    // },
    // "박스부-중앙홀": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
    //     return DYdia5V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    // },
    "박스부-지점": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
        return DYdia6V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    },
    "박스부-지점2": function (sectionPoint, stPointDict, diaSection, gridkey, diaSectionName) {
        return DYdia6V2(sectionPoint, stPointDict, diaSection, gridkey, diaSectionName);
    },
};

export function DYdia6V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    // let diaSection = {
    //     "webThickness": 12,
    //     "hstiffWidth": 270,
    //     "hstiffWidth2": 200,
    //     "hstiffThickness": 12,
    //     "hstiffHeight": 610,
    //     "scallopRadius": 35,
    //     "ribHoleD": 42,
    //     "ribHoleR": 25,
    //     "holeBottomY": 550,
    //     "holeCenterOffset": -679,
    //     "holeWidth": 450,
    //     "holeHeight": 700,
    //     "holeFilletR": 100,
    //     "holeStiffThickness": 10,
    //     "holeStiffhl": 610,
    //     "holeStiffvl": 860,
    //     "holeStiffmargin": 20,
    //     "holeStiffHeight": 100,
    //     "supportStiffLayout": [-200, 0, 200],
    //     "supportStiffWidth": 265,
    //     "supportStiffThickness": 26
    // } //  임시 입력변수
    let sectionID = sectionPoint.input.wuf.toFixed(0)
                    +sectionPoint.input.wlf.toFixed(0)
                    +sectionPoint.input.tlf.toFixed(0)
                    +sectionPoint.input.tuf.toFixed(0)
                    +sectionPoint.input.tw.toFixed(0);

    let urib = sectionPoint.input.Urib;
    let lrib = sectionPoint.input.Lrib;
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    let diaHeight = tl.y - gradient * tr.x - bl.y;
    let urib2 = urib;
    urib2.ribHoleD = diaSection.ribHoleD;
    urib2.ribHoleR = diaSection.ribHoleR;
    let lrib2 = lrib;
    lrib2.ribHoleD = diaSection.ribHoleD;
    lrib2.ribHoleR = diaSection.ribHoleR;
    lrib.type = 1; //하부리브 스캘럽
    
    let sec = 1/Math.cos(point.skew);
    let result = {
        parent: [],
        children: [],
    };
    const group = "Girder"+String(point.girderNum)
    let holeRect = [
        { x: sec*(diaSection.holeWidth / 2 + diaSection.holeCenterOffset), y: bl.y + diaSection.holeBottomY },
        { x: sec*(-diaSection.holeWidth / 2 + diaSection.holeCenterOffset), y: bl.y + diaSection.holeBottomY },
        { x: sec*(-diaSection.holeWidth / 2 + diaSection.holeCenterOffset), y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
        { x: sec*(diaSection.holeWidth / 2 + diaSection.holeCenterOffset), y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
    ];
    let holePoints = [];
    holePoints.push(...GetArcPoints(holeRect[0], holeRect[1], holeRect[2], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[1], holeRect[2], holeRect[3], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[2], holeRect[3], holeRect[0], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[3], holeRect[0], holeRect[1], diaSection.holeFilletR, 4));
    let mainPlatePts = vPlateGenV2([bl, br, tr, tl], point, [0, 1, 2, 3], diaSection.scallopRadius, urib2, lrib2)

    let ref = toRefPoint(point, true);//skewed vertical plane
    result["children"].push(new Extrude(mainPlatePts,diaSection.webThickness,
        {refPoint : ref, holes : [holePoints]},"steelBox", 
        { group : group , part: gridkey, key: "mainPlate", girder: point.girderNum, seg: point.segNum }))

    let holeCenter1 = {
        x: diaSection.holeCenterOffset,
        y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
    };
    let hstiff1 = [
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
    ];
    result["children"].push(new Extrude(hstiff1,diaSection.holeStiffThickness,
        {refPoint : new RefPoint(PointToSkewedGlobal(holeCenter1, point), ref.xAxis, 0)},"steelBox", 
        { group : group , part: gridkey, key: "hStiff1", girder: point.girderNum, seg: point.segNum }))

    let holeCenter2 = { x: diaSection.holeCenterOffset, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin };

    result["children"].push(new Extrude(hstiff1,diaSection.holeStiffThickness,
        {refPoint : new RefPoint(PointToSkewedGlobal(holeCenter2, point), ref.xAxis, 0)},"steelBox", 
        { group : group , part: gridkey, key: "hStiff2", girder: point.girderNum, seg: point.segNum }))

    let vstiff1 = [
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
    ];
    let holeCenter3 = {
        x: diaSection.holeCenterOffset - diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };
    let holeCenter4 = {
        x: diaSection.holeCenterOffset + diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };

    let cp3 = new RefPoint(PointToSkewedGlobal(holeCenter3, point), ref.xAxis, 0)
    let cp4 = new RefPoint(PointToSkewedGlobal(holeCenter4, point), ref.xAxis, 0)
    result["children"].push(new Extrude(vstiff1,diaSection.holeStiffThickness,
        {refPoint : {...cp3, yRotation : Math.PI/2}},"steelBox", 
        { group : group , part: gridkey, key: "vStiff1", girder: point.girderNum, seg: point.segNum }))
    result["children"].push(new Extrude(vstiff1,diaSection.holeStiffThickness,
        {refPoint : {...cp4, yRotation : Math.PI/2}},"steelBox", 
        { group : group , part: gridkey, key: "vStiff2", girder: point.girderNum, seg: point.segNum }))
    
    let supportStiffLayout = [];
    if (isNaN(diaSection.supportStiffLayout)) {
        diaSection.supportStiffLayout.split(",").forEach(el => supportStiffLayout.push(el * 1));
    } else {
        supportStiffLayout.push(diaSection.supportStiffLayout);
    }

    for (let i in supportStiffLayout) {
        let supportStiffCenter1 = { x: supportStiffLayout[i], y: tl.y + gradient * (supportStiffLayout[i] - tl.x) };
        let supportStiff1 = [
            { x: 0, y: diaSection.webThickness / 2 },
            { x: supportStiffCenter1.y - bl.y, y: diaSection.webThickness / 2 },
            { x: supportStiffCenter1.y - bl.y, y: diaSection.supportStiffWidth + diaSection.webThickness / 2 },
            { x: 0, y: diaSection.supportStiffWidth + diaSection.webThickness / 2 },
        ];
        let supportStiff2 = [
            { x: 0, y: -diaSection.webThickness / 2 },
            { x: supportStiffCenter1.y - bl.y, y: -diaSection.webThickness / 2 },
            { x: supportStiffCenter1.y - bl.y, y: -diaSection.supportStiffWidth - diaSection.webThickness / 2 },
            { x: 0, y: -diaSection.supportStiffWidth - diaSection.webThickness / 2 },
        ];
        let cp = new RefPoint(PointToSkewedGlobal(supportStiffCenter1, point), point.xAxis, 0)
        result["children"].push(new Extrude(supportStiff1,diaSection.supportStiffThickness,
            {refPoint : {...cp, yRotation : Math.PI/2}},"steelBox", 
            { group : group , part: gridkey, key: "supportStiff1" + i, girder: point.girderNum, seg: point.segNum }))
        
        result["children"].push(new Extrude(supportStiff2,diaSection.supportStiffThickness,
            {refPoint : {...cp, yRotation : Math.PI/2}},"steelBox", 
            { group : group , part: gridkey, key: "supportStiff2" + i, girder: point.girderNum, seg: point.segNum }))
    }
    let hStiffCenter = { x: 0, y: bl.y + diaSection.hstiffHeight };
    let ref1 = new RefPoint(PointToSkewedGlobal(hStiffCenter, point), point.xAxis,0)
    let tan = Math.tan(point.skew)
    let sign = diaSection.holeCenterOffset < 0 ? 1 : -1;
    const holeWidth = sign * diaSection.holeWidth;
    let w0 = diaSection.webThickness / 2;
    let w1 = diaSection.holeStiffHeight + diaSection.webThickness / 2;
    let w2 = diaSection.hstiffWidth + diaSection.webThickness / 2;
    let w3 = diaSection.hstiffWidth2 + diaSection.webThickness / 2;
    let hx = [
        [bl.x + lwCot * diaSection.hstiffHeight, w2],
        [br.x + rwCot * diaSection.hstiffHeight, w2],
    ];
    if (
        diaSection.hstiffHeight < diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2 &&
        diaSection.hstiffHeight > diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2
    ) {
        let dx = ((diaSection.hstiffHeight - diaSection.holeBottomY) / diaSection.holeHeight) * 100;
        hx.push(
            [diaSection.holeCenterOffset - holeWidth / 2 - sign * (diaSection.holeStiffmargin + diaSection.holeStiffThickness + dx), w1],
            [diaSection.holeCenterOffset + holeWidth / 2 + sign * (diaSection.holeStiffmargin + diaSection.holeStiffThickness), w1]
        );
    }
    for (let i in supportStiffLayout) {
        hx.push([supportStiffLayout[i] - diaSection.supportStiffThickness / 2, w3]);
        hx.push([supportStiffLayout[i] + diaSection.supportStiffThickness / 2, w3]);
    }
    hx.sort(function (a, b) {
        return a[0] > b[0] ? 1 : -1;
    });
    let h2 = [];
    let h3 = [];
    for (let i = 0; i < hx.length / 2; i++) {
        h2.push([
            { x: hx[i * 2][0], y: -(hx[i * 2][1] - 10) + tan*(hx[i * 2][0])},
            { x: hx[i * 2][0] + 10, y: -hx[i * 2][1]  + tan*(hx[i * 2][0]+10)},
            { x: hx[i * 2 + 1][0] - 10, y: -hx[i * 2 + 1][1]  + tan*(hx[i * 2+1][0]-10)},
            { x: hx[i * 2 + 1][0], y: -(hx[i * 2 + 1][1] - 10)  + tan*(hx[i * 2+1][0])},
            { x: hx[i * 2 + 1][0], y: -(w0 + 10)  + tan*(hx[i * 2+1][0])},
            { x: hx[i * 2 + 1][0] - 10, y: -w0  + tan*(hx[i * 2+1][0]-10)},
            { x: hx[i * 2][0] + 10, y: -w0  + tan*(hx[i * 2][0]+10)},
            { x: hx[i * 2][0], y: -(w0 + 10)  + tan*(hx[i * 2][0])},
        ]);
        h3.push([
            { x: hx[i * 2][0], y: hx[i * 2][1] - 10 + tan*(hx[i * 2][0])},
            { x: hx[i * 2][0] + 10, y: hx[i * 2][1] + tan*(hx[i * 2][0]+10)},
            { x: hx[i * 2 + 1][0] - 10, y: hx[i * 2 + 1][1]  + tan*(hx[i * 2+1][0]-10)},
            { x: hx[i * 2 + 1][0], y: hx[i * 2 + 1][1] - 10  + tan*(hx[i * 2+1][0])},
            { x: hx[i * 2 + 1][0], y: w0 + 10 + tan*(hx[i * 2+1][0])},
            { x: hx[i * 2 + 1][0] - 10, y: w0 + tan*(hx[i * 2+1][0]-10)},
            { x: hx[i * 2][0] + 10, y: w0 + tan*(hx[i * 2][0]+10)},
            { x: hx[i * 2][0], y: w0 + 10 + tan*(hx[i * 2][0])},
        ]);
    }
    for (let i = 0; i < hx.length / 2; i++) {
        result["children"].push(new Extrude(h2[i],diaSection.hstiffThickness,
            {refPoint : ref1},"steelBox", 
            { group : group , part: gridkey, key: "h2" + i, girder: point.girderNum, seg: point.segNum }))
        result["children"].push(new Extrude(h3[i],diaSection.hstiffThickness,
            {refPoint : ref1},"steelBox", 
            { group : group , part: gridkey, key: "h3" + i, girder: point.girderNum, seg: point.segNum }))
    }
    return result;
}

export function DYdia5V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    let result = {
        parent: [],
        children: [],
    };
    // let diaSection = {
    //     "webThickness": 12,
    //     "hstiffWidth": 270,
    //     "hstiffThickness": 12,
    //     "hstiffHeight": 362,
    //     "scallopRadius": 35,
    //     "ribHoleD": 42,
    //     "ribHoleR": 25,
    //     "holeBottomY": 330,
    //     "holeWidth": 700,
    //     "holeHeight": 700,
    //     "holeFilletR": 100,
    //     "holeStiffThickness": 10,
    //     "holeStiffhl": 860,
    //     "holeStiffvl": 860,
    //     "holeStiffmargin": 20,
    //     "holeStiffHeight": 100
    // } //  임시 입력변수
    let urib = sectionPoint.input.Urib;
    let lrib = sectionPoint.input.Lrib;
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];

    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    let diaHeight = tl.y - gradient * tr.x - bl.y;
    let urib2 = urib;
    urib2.ribHoleD = diaSection.ribHoleD;
    urib2.ribHoleR = diaSection.ribHoleR;
    let lrib2 = lrib;
    lrib2.ribHoleD = diaSection.ribHoleD;
    lrib2.ribHoleR = diaSection.ribHoleR;
    lrib.type = 0; //하부리브 스캘럽
    let holeRect = [
        { x: diaSection.holeWidth / 2, y: bl.y + diaSection.holeBottomY },
        { x: -diaSection.holeWidth / 2, y: bl.y + diaSection.holeBottomY },
        { x: -diaSection.holeWidth / 2, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
        { x: diaSection.holeWidth / 2, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight },
    ];
    let holePoints = [];
    holePoints.push(...GetArcPoints(holeRect[0], holeRect[1], holeRect[2], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[1], holeRect[2], holeRect[3], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[2], holeRect[3], holeRect[0], diaSection.holeFilletR, 4));
    holePoints.push(...GetArcPoints(holeRect[3], holeRect[0], holeRect[1], diaSection.holeFilletR, 4));
    // result["mainPlate"] = vPlateGenV2([bl, br, tr, tl], point, diaSection.webThickness, [0, 1, 2, 3], diaSection.scallopRadius, urib2, lrib2, holePoints, [2, 3], [0, 1, 2, 3], [0, 1]);
    result["children"].push({
        ...vPlateGenV2(
            [bl, br, tr, tl],
            point,
            diaSection.webThickness,
            [0, 1, 2, 3],
            diaSection.scallopRadius,
            urib2,
            lrib2,
            holePoints,
            [2, 3],
            [0, 1, 2, 3],
            [0, 1]
        ),
        meta: { part: gridkey, key: "mainPlate", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tuf,
                line: [[tl, tr]],
                sectionView: {
                    point: WeldingPoint([tl, tr], 0.1),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[bl, tl]],
                sectionView: {
                    point: WeldingPoint([bl, tl], 0.1),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[br, tr]],
                sectionView: {
                    point: WeldingPoint([br, tr], 0.7),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[bl, br]],
                sectionView: {
                    point: WeldingPoint([bl, br], 0.9),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });

    let holeCenter1 = { x: 0, y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness };
    let hstiff1 = [
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffhl / 2, y: diaSection.webThickness / 2 + diaSection.holeStiffHeight },
    ];
    let hstiff2D1 = [
        { x: -diaSection.holeStiffhl / 2, y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness },
        { x: diaSection.holeStiffhl / 2, y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin - diaSection.holeStiffThickness },
        { x: diaSection.holeStiffhl / 2, y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin },
        { x: -diaSection.holeStiffhl / 2, y: bl.y + diaSection.holeBottomY - diaSection.holeStiffmargin },
    ];
    // result["hstiff1"] = hPlateGenV2(hstiff1, PointToGlobal(point, holeCenter1), diaSection.holeStiffThickness, 0, point.skew, 0, 0, hstiff2D1, false, [1, 2], true)
    result["children"].push({
        ...hPlateGenV2(
            hstiff1,
            PointToGlobal(point, holeCenter1),
            diaSection.holeStiffThickness,
            0,
            point.skew,
            0,
            0,
            hstiff2D1,
            false,
            [1, 2],
            true
        ),
        meta: { part: gridkey, key: "hstiff1", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[hstiff1[0], hstiff1[1]]],
                sectionView: {
                    point: holeCenter1,
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let holeCenter2 = { x: 0, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin };
    let hstiff2D2 = [
        {
            x: -diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
        },
        {
            x: diaSection.holeStiffhl / 2,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
        },
        { x: diaSection.holeStiffhl / 2, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin },
        { x: -diaSection.holeStiffhl / 2, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight + diaSection.holeStiffmargin },
    ];
    // result["hstiff2"] = hPlateGenV2(hstiff1, PointToGlobal(point, holeCenter2), diaSection.holeStiffThickness, 0, point.skew, 0, 0, hstiff2D2, true, [1, 2], false)
    result["children"].push({
        ...hPlateGenV2(
            hstiff1,
            PointToGlobal(point, holeCenter2),
            diaSection.holeStiffThickness,
            0,
            point.skew,
            0,
            0,
            hstiff2D2,
            true,
            [1, 2],
            false
        ),
        meta: { part: gridkey, key: "hstiff2", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[hstiff1[0], hstiff1[1]]],
                sectionView: {
                    point: holeCenter2,
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let holeCenter3 = {
        x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
        y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2,
    };
    let vstiff1 = [
        { x: -diaSection.holeStiffvl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 },
        { x: diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
        { x: -diaSection.holeStiffhl / 2, y: -diaSection.webThickness / 2 - diaSection.holeStiffHeight },
    ];
    let vstiff2D1 = [
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
    ];
    // result["vstiff1"] = hPlateGenV2(vstiff1, PointToGlobal(point, holeCenter3), diaSection.holeStiffThickness, 0, point.skew, 0, Math.PI / 2, vstiff2D1, true, [0, 1], true)
    result["children"].push({
        ...hPlateGenV2(
            vstiff1,
            PointToGlobal(point, holeCenter3),
            diaSection.holeStiffThickness,
            0,
            point.skew,
            0,
            Math.PI / 2,
            vstiff2D1,
            true,
            [0, 1],
            true
        ),
        meta: { part: gridkey, key: "vstiff1", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[vstiff1[0], vstiff1[1]]],
                sectionView: {
                    point: holeCenter3,
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let holeCenter4 = { x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin, y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 };
    let vstiff2D2 = [
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 - diaSection.holeStiffvl / 2,
        },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin,
            y: bl.y + diaSection.holeBottomY + diaSection.holeHeight / 2 + diaSection.holeStiffvl / 2,
        },
    ];
    // result["vstiff2"] = hPlateGenV2(vstiff1, PointToGlobal(point, holeCenter4), diaSection.holeStiffThickness, 0, point.skew, 0, Math.PI / 2, vstiff2D2, true, null, true)
    result["children"].push({
        ...hPlateGenV2(
            vstiff1,
            PointToGlobal(point, holeCenter4),
            diaSection.holeStiffThickness,
            0,
            point.skew,
            0,
            Math.PI / 2,
            vstiff2D2,
            true,
            null,
            true
        ),
        meta: { part: gridkey, key: "vstiff2", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.holeStiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[vstiff1[0], vstiff1[1]]],
                sectionView: {
                    point: holeCenter4,
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });

    let hStiffCenter = { x: 0, y: bl.y + diaSection.hstiffHeight };
    let h1 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: -diaSection.hstiffWidth - diaSection.webThickness / 2 },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: -diaSection.holeStiffHeight - diaSection.webThickness / 2,
        },
        { x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness, y: -diaSection.webThickness / 2 },
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: -diaSection.webThickness / 2 },
    ];
    let h2D1 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: bl.y + diaSection.hstiffHeight },
        { x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness, y: bl.y + diaSection.hstiffHeight },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness,
        },
        { x: bl.x + lwCot * (diaSection.hstiffHeight + diaSection.hstiffThickness), y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness },
    ];
    // result["h1"] = hPlateGenV2(h1, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, h2D1, true, null, true);
    let h1Model = hPlateGenV2(h1, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, h2D1, true, null, true);
    result["children"].push({
        ...h1Model,
        meta: { part: gridkey, key: "h1", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.hstiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[h1[3], h1[0], h1[1], h1[2]]],
                sectionView: {
                    point: WeldingPoint([h2D1[0], h2D1[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let h2 = [
        { x: br.x + rwCot * diaSection.hstiffHeight, y: -diaSection.hstiffWidth - diaSection.webThickness / 2 },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: -diaSection.holeStiffHeight - diaSection.webThickness / 2,
        },
        { x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness, y: -diaSection.webThickness / 2 },
        { x: br.x + rwCot * diaSection.hstiffHeight, y: -diaSection.webThickness / 2 },
    ];
    let h2D2 = [
        { x: br.x + rwCot * diaSection.hstiffHeight, y: bl.y + diaSection.hstiffHeight },
        { x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness, y: bl.y + diaSection.hstiffHeight },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness,
        },
        { x: br.x + rwCot * (diaSection.hstiffHeight + diaSection.hstiffThickness), y: bl.y + diaSection.hstiffHeight + diaSection.hstiffThickness },
    ];
    // result["h2"] = hPlateGenV2(h2, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, h2D2, true, null, true);
    let h2Model = hPlateGenV2(h2, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, h2D2, true, null, true);
    result["children"].push({
        ...h2Model,
        meta: { part: gridkey, key: "h2", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.hstiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[h2[3], h2[0], h2[1], h2[2]]],
                sectionView: {
                    point: WeldingPoint([h2D2[0], h2D2[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let h3 = [
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: diaSection.hstiffWidth + diaSection.webThickness / 2 },
        {
            x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness,
            y: diaSection.holeStiffHeight + diaSection.webThickness / 2,
        },
        { x: -diaSection.holeWidth / 2 - diaSection.holeStiffmargin - diaSection.holeStiffThickness, y: diaSection.webThickness / 2 },
        { x: bl.x + lwCot * diaSection.hstiffHeight, y: diaSection.webThickness / 2 },
    ];
    // result["h3"] = hPlateGenV2(h3, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, [], true, null, true);
    let h3Model = hPlateGenV2(h3, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, [], true, null, true);
    result["children"].push({
        ...h3Model,
        meta: { part: gridkey, key: "h3", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.hstiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[h3[3], h3[0], h3[1], h3[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    });

    let h4 = [
        { x: br.x + rwCot * diaSection.hstiffHeight, y: diaSection.hstiffWidth + diaSection.webThickness / 2 },
        {
            x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness,
            y: diaSection.holeStiffHeight + diaSection.webThickness / 2,
        },
        { x: diaSection.holeWidth / 2 + diaSection.holeStiffmargin + diaSection.holeStiffThickness, y: diaSection.webThickness / 2 },
        { x: br.x + rwCot * diaSection.hstiffHeight, y: diaSection.webThickness / 2 },
    ];
    // result["h4"] = hPlateGenV2(h4, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, [], true, null, true);
    let h4Model = hPlateGenV2(h4, PointToGlobal(point, hStiffCenter), diaSection.hstiffThickness, 0, point.skew, 0, 0, [], true, null, true);
    result["children"].push({
        ...h4Model,
        meta: { part: gridkey, key: "h4", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.hstiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[h3[3], h3[0], h3[1], h3[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let hPlateModel = [h1Model, h3Model, h2Model, h4Model];
    let topLeftDimPoints = [
        hPlateModel[0]["model"]["topView"][0],
        hPlateModel[0]["model"]["topView"][1],
        hPlateModel[0]["model"]["topView"][2],
        hPlateModel[1]["model"]["topView"][2],
        hPlateModel[1]["model"]["topView"][1],
        hPlateModel[1]["model"]["topView"][0],
    ];
    let topRightDimPoints = [
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][0],
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][1],
        hPlateModel[hPlateModel.length - 1]["model"]["topView"][2],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][2],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][1],
        hPlateModel[hPlateModel.length - 2]["model"]["topView"][0],
    ];
    let sectionLeftDimPoints = [holeRect[1], holeRect[2]];
    let sectionRightDimPoints = [
        { x: h2D2[1].x, y: hStiffCenter.y },
        { x: h2D2[1].x, y: hStiffCenter.y + diaSection.hstiffThickness },
    ];
    let sd = SectionDimension(sectionPoint);
    diaSection["totalHeight"] = diaHeight;
    let sectionID = sectionPoint.input.wuf.toFixed(0)
                    +sectionPoint.input.wlf.toFixed(0)
                    +sectionPoint.input.tlf.toFixed(0)
                    +sectionPoint.input.tuf.toFixed(0)
                    +sectionPoint.input.tw.toFixed(0);
    let parent = {
        part: gridkey,
        id:
            sectionID + 
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        diaSection,
        properties: {
            Tdia: diaSection.webThickness,
            hole: {
                H: diaSection.holeHeight,
                B: diaSection.holeWidth,
                H1: diaHeight - (diaSection.holeBottomY + diaSection.holeHeight),
                H2: diaSection.holeBottomY,
                e: 0, //diaSection.holeCenterOffset>0? diaSection.holeCenterOffset - diaSection.holeWidth/2 : diaSection.holeCenterOffset + diaSection.holeWidth/2,
            },
        },
        model: {
            sectionView: sectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                {
                    type: "DIMALIGN",
                    points: [sd.top[0], sd.top[sd.top.length - 1]],
                    index: sd.topIndex ? 0 : 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 2,
                },
                {
                    type: "DIMALIGN",
                    points: sd.top,
                    index: sd.topIndex ? 0 : sd.top.length - 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 1,
                },
                {
                    type: "DIMALIGN",
                    points: [sd.bottom[0], sd.bottom[sd.bottom.length - 1]],
                    index: 0,
                    isHorizontal: true,
                    isTopOrRight: false,
                    offsetIndex: 2,
                },
                { type: "DIMALIGN", points: sd.bottom, index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 1 },
                { type: "DIMALIGN", points: sd.left, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
                {
                    type: "DIMALIGN",
                    points: [...sd.left, ...sectionLeftDimPoints],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 3,
                },
                { type: "DIMALIGN", points: sd.right, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 4 },
                {
                    type: "DIMALIGN",
                    points: [...sd.right, ...sectionRightDimPoints],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 3,
                },
            ],
            topView: [
                {
                    type: "DIMALIGN",
                    points: [topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                {
                    type: "DIMALIGN",
                    points: [topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
            bottomView: [
                {
                    type: "DIMALIGN",
                    points: [topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                {
                    type: "DIMALIGN",
                    points: [topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
        },
    };
    result["parent"].push(parent);

    return result;
}

export function DYdia3V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    let result = {
        parent: [],
        children: [],
    };
    // upperHeight: 900,
    // let ds = {
    //     "webHeight": 576,
    //     "flangeThickness": 12,
    //     "flangeWidth": 250,
    //     "webThickness": 12,
    //     "stiffWidth": 150,
    //     "stiffThickness": 12,
    //     "scallopRadius": 35,
    //     "bracketWidth": 450,
    //     "bracketLength": 529,
    //     "bracketScallopR": 100,
    //     "webJointWidth": 330,
    //     "webJointHeight": 440,
    //     "webJointThickness": 10,
    //     "flangeJointLength": 480,
    //     "flangeJointWidth": 80,
    //     "flangeJointThickness": 10
    // } //  임시 입력변수

    let wBolt = {
        P: 90,
        G: 75,
        pNum: 5,
        gNum: 2,
        dia: 22,
        size: 37,
        t: 14,
    };
    let fBolt = {
        P: 170,
        G: 75,
        pNum: 2,
        gNum: 3,
        dia: 22,
        size: 37,
        t: 14,
    };

    let uflange = sectionPoint.uflange;
    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    // const rotationY = (point.skew - 90) * Math.PI / 180
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    const gradCos = (tr.x - tl.x) / Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2);
    const gradSin = gradient * gradCos;
    const gradRadian = -Math.atan(gradient);

    let diaHeight = tl.y - gradient * tr.x - bl.y;

    let upperPlate = [];
    let lowerPlate = [
        { x: tl.x - lwCot * diaSection.webHeight, y: tl.y - diaSection.webHeight },
        { x: tl.x - lwCot * (diaSection.webHeight + diaSection.flangeThickness), y: tl.y - diaSection.webHeight - diaSection.flangeThickness },
        { x: tr.x - rwCot * (diaSection.webHeight + diaSection.flangeThickness), y: tr.y - diaSection.webHeight - diaSection.flangeThickness },
        { x: tr.x - rwCot * diaSection.webHeight, y: tr.y - diaSection.webHeight },
    ];

    if (uflange[0].length > 0) {
        upperPlate = [
            uflange[0][1],
            { x: uflange[0][1].x - gradSin * diaSection.flangeThickness, y: uflange[0][1].y + gradCos * diaSection.flangeThickness },
            { x: uflange[1][1].x - gradSin * diaSection.flangeThickness, y: uflange[1][1].y + gradCos * diaSection.flangeThickness },
            uflange[1][1],
        ];
        let bracketPoint = [
            PointToGlobal(point, lowerPlate[1]),
            PointToGlobal(point, lowerPlate[2]),
            PointToGlobal(point, upperPlate[0]),
            PointToGlobal(point, upperPlate[3]),
        ];
        let bracketSide = [
            [lowerPlate[0], lowerPlate[1]],
            [lowerPlate[3], lowerPlate[2]],
            [upperPlate[0], upperPlate[1]],
            [upperPlate[3], upperPlate[2]],
        ];

        // let rot = (point.skew - 90) * Math.PI / 180;
        // let cos = Math.cos(rot);
        // let sin = Math.sin(rot);
        for (let i = 0; i < 4; i++) {
            let sign = i % 2 === 0 ? 1 : -1;
            let bracketLength = i < 2 ? diaSection.bracketLength : diaSection.bracketLength - (uflange[0][1].x - tl.x);
            let bracket2D = PlateRestPoint(bracketSide[i][0], bracketSide[i][1], gradient, gradient, sign * bracketLength);
            let lowerbracket1 = [
                Skewed({ x: 0, y: diaSection.bracketWidth / 2 }, point.skew),
                Skewed({ x: sign * 20, y: diaSection.bracketWidth / 2 }, point.skew),
                Skewed({ x: sign * 20, y: diaSection.flangeWidth / 2 }, point.skew),
                Rotated({ x: sign * bracketLength, y: diaSection.flangeWidth / 2 }, point.skew),
                Rotated({ x: sign * bracketLength, y: -diaSection.flangeWidth / 2 }, point.skew),
                Skewed({ x: sign * 20, y: -diaSection.flangeWidth / 2 }, point.skew),
                Skewed({ x: sign * 20, y: -diaSection.bracketWidth / 2 }, point.skew),
                Skewed({ x: 0, y: -diaSection.bracketWidth / 2 }, point.skew),
            ];
            let bracketShape = [
                lowerbracket1[0],
                lowerbracket1[1],
                ...GetArcPoints(lowerbracket1[1], lowerbracket1[2], lowerbracket1[3], diaSection.bracketScallopR, 4),
                lowerbracket1[3],
                lowerbracket1[4],
                ...GetArcPoints(lowerbracket1[4], lowerbracket1[5], lowerbracket1[6], diaSection.bracketScallopR, 4),
                lowerbracket1[6],
                lowerbracket1[7],
            ];
            let top2D = i < 2 ? false : true;
            let bottom2D = i < 2 ? true : false;
            let weldType = i < 2 ? "FF" : "B";
            let t2 = i < 2 ? sectionPoint.input.tw : sectionPoint.input.tuf;
            result["children"].push({
                ...hPlateGenV2(bracketShape, bracketPoint[i], diaSection.flangeThickness, 0, 90, 0, gradRadian, bracket2D, top2D, null, bottom2D),
                meta: { part: gridkey, key: "bracket" + i.toFixed(0), girder: point.girderNum, seg: point.segNum },
                properties: {},
                weld: [
                    {
                        type: weldType,
                        thickness1: diaSection.flangeThickness,
                        thickness2: t2,
                        line: [[lowerbracket1[0], lowerbracket1[7]]],
                        sectionView: {
                            point: bracketSide[i][0],
                            isUpper: true,
                            isRight: true,
                            isXReverse: false,
                            isYReverse: false,
                        },
                    },
                ],
                textLabel: {},
                dimension: {},
            });

            // {
            //   points: bracketShape,
            //   Thickness: i < 2 ? dsi.flangeThickness : dsi.flangeThickness,
            //   z: 0,
            //   rotationX: 0,
            //   rotationY: gradRadian,
            //   hole: [],
            //   point: bracketPoint[i],
            //   // size : PlateSize2(lowerPlate,1,dsi.lowerTopThickness,dsi.lowerTopwidth),
            //   // anchor : [[lowerTopPoints[1].x,lowerTopPoints[1].y + 50],[lowerTopPoints[2].x,lowerTopPoints[2].y + 50]]
            // }
        }
    }
    let stiffnerPoint = [
        [bl, lowerPlate[1]],
        [br, lowerPlate[2]],
    ];
    for (let i = 0; i < stiffnerPoint.length; i++) {
        let stiffWidth = i % 2 === 0 ? diaSection.stiffWidth : -diaSection.stiffWidth;
        let stiffner = PlateRestPoint(stiffnerPoint[i][0], stiffnerPoint[i][1], 0, gradient, stiffWidth);
        let side2D = i % 2 === 0 ? null : [0, 3, 2, 1];
        // result["stiffner" + i.toFixed(0)] = vPlateGenV2(stiffner, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], null, side2D, null);
        result["children"].push({
            ...vPlateGenV2(stiffner, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], null, side2D, null),
            meta: { part: gridkey, key: "stiffner" + i.toFixed(0), girder: point.girderNum, seg: point.segNum },
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[stiffnerPoint[i][0], stiffnerPoint[i][1]]],
                    sectionView: {
                        point: WeldingPoint([stiffnerPoint[i][0], stiffnerPoint[i][1]], 0.5),
                        isUpper: true,
                        isRight: true,
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: sectionPoint.input.tlf,
                    line: [[stiffner[0], stiffner[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: diaSection.flangeThickness,
                    line: [[stiffner[1], stiffner[2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        });
    }
    let webBracketPoint = [
        [lowerPlate[0], tl],
        [lowerPlate[3], tr],
    ];
    for (let i = 0; i < webBracketPoint.length; i++) {
        let stiffWidth = i % 2 === 0 ? diaSection.bracketLength : -diaSection.bracketLength;
        let stiffner = PlateRestPoint(webBracketPoint[i][0], webBracketPoint[i][1], gradient, gradient, stiffWidth);
        // result["webBracket" + i.toFixed(0)] = vPlateGenV2(stiffner, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], [1, 2], null, [0, 3]);
        result["children"].push({
            ...vPlateGenV2(stiffner, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], [1, 2], null, [0, 3]),
            meta: { part: gridkey, key: "webBracket" + i.toFixed(0), girder: point.girderNum, seg: point.segNum },
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[stiffner[0], stiffner[1]]],
                    sectionView: {
                        point: WeldingPoint([stiffner[0], stiffner[1]], 0.5),
                        isUpper: true,
                        isRight: true,
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: diaSection.flangeThickness,
                    line: [[stiffner[0], stiffner[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: diaSection.flangeThickness,
                    line: [[stiffner[1], stiffner[2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        });
    }

    let webPlate = [
        { x: lowerPlate[0].x + diaSection.bracketLength, y: lowerPlate[0].y + diaSection.bracketLength * gradient },
        { x: lowerPlate[3].x - diaSection.bracketLength, y: lowerPlate[3].y - diaSection.bracketLength * gradient },
        { x: tr.x - diaSection.bracketLength, y: tr.y - diaSection.bracketLength * gradient },
        { x: tl.x + diaSection.bracketLength, y: tl.y + diaSection.bracketLength * gradient },
    ];

    // result["webPlate"] = vPlateGenV2(webPlate, point, diaSection.webThickness, [], diaSection.scallopRadius, null, null, [], [2, 3], [0, 1, 2, 3], [0, 1]);
    result["children"].push({
        ...vPlateGenV2(webPlate, point, diaSection.webThickness, [], diaSection.scallopRadius, null, null, [], [2, 3], [0, 1, 2, 3], [0, 1]),
        meta: { part: gridkey, key: "webPlate", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.flangeThickness,
                line: [[webPlate[0], webPlate[1]]],
                sectionView: {
                    point: WeldingPoint([webPlate[0], webPlate[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.flangeThickness,
                line: [[webPlate[2], webPlate[3]]],
                sectionView: {
                    point: WeldingPoint([webPlate[2], webPlate[3]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let upperflange = [
        { x: tl.x + diaSection.bracketLength, y: tl.y + diaSection.bracketLength * gradient },
        { x: tl.x + diaSection.bracketLength, y: tl.y + diaSection.bracketLength * gradient + diaSection.flangeThickness },
        { x: tr.x - diaSection.bracketLength, y: tr.y - diaSection.bracketLength * gradient + diaSection.flangeThickness },
        { x: tr.x - diaSection.bracketLength, y: tr.y - diaSection.bracketLength * gradient },
    ];
    let uPoint = PointToGlobal(point, { x: 0, y: -gradient * tl.x + tl.y });
    let upperflangeL = Math.sqrt((upperflange[3].x - upperflange[0].x) ** 2 + (upperflange[3].y - upperflange[0].y) ** 2);
    let upperflange2 = [
        Rotated({ x: -upperflangeL / 2, y: diaSection.flangeWidth / 2 }, point.skew),
        Rotated({ x: -upperflangeL / 2, y: -diaSection.flangeWidth / 2 }, point.skew),
        Rotated({ x: upperflangeL / 2, y: -diaSection.flangeWidth / 2 }, point.skew),
        Rotated({ x: upperflangeL / 2, y: diaSection.flangeWidth / 2 }, point.skew),
    ];
    // result["upperflange"] = hPlateGenV2(upperflange2, uPoint, diaSection.flangeThickness, 0, 90, 0, gradRadian, upperflange, true, [0, 1], false)
    result["children"].push({
        ...hPlateGenV2(upperflange2, uPoint, diaSection.flangeThickness, 0, 90, 0, gradRadian, upperflange, true, [0, 1], false),
        meta: { part: gridkey, key: "upperflange", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: {},
        textLabel: {},
        dimension: {},
    });
    // result["upperflange"] = { points: upperflange, Thickness: dsi.flangeWidth, z: - dsi.flangeWidth / 2, rotationX: Math.PI / 2, rotationY: rotationY, hole: [], }
    let lowerflange = [
        { x: lowerPlate[0].x + diaSection.bracketLength, y: lowerPlate[0].y + diaSection.bracketLength * gradient - diaSection.flangeThickness },
        { x: lowerPlate[0].x + diaSection.bracketLength, y: lowerPlate[0].y + diaSection.bracketLength * gradient },
        { x: lowerPlate[3].x - diaSection.bracketLength, y: lowerPlate[3].y - diaSection.bracketLength * gradient },
        { x: lowerPlate[3].x - diaSection.bracketLength, y: lowerPlate[3].y - diaSection.bracketLength * gradient - diaSection.flangeThickness },
    ];
    let lPoint = PointToGlobal(point, { x: 0, y: -gradient * lowerflange[0].x + lowerflange[0].y });
    let lowerflangeL = Math.sqrt((lowerflange[3].x - lowerflange[0].x) ** 2 + (lowerflange[3].y - lowerflange[0].y) ** 2);
    let lowerflange2 = [
        Rotated({ x: -lowerflangeL / 2, y: diaSection.flangeWidth / 2 }, point.skew),
        Rotated({ x: -lowerflangeL / 2, y: -diaSection.flangeWidth / 2 }, point.skew),
        Rotated({ x: lowerflangeL / 2, y: -diaSection.flangeWidth / 2 }, point.skew),
        Rotated({ x: lowerflangeL / 2, y: diaSection.flangeWidth / 2 }, point.skew),
    ];
    // result["lowerflange"] = hPlateGenV2(lowerflange2, lPoint, diaSection.flangeThickness, 0, 90, 0, gradRadian, lowerflange, false, [0, 1], true)
    // result["lowerflange"] = { points: lowerflange, Thickness: dsi.flangeWidth, z: - dsi.flangeWidth / 2, rotationX: Math.PI / 2, rotationY: rotationY, hole: [], }
    result["children"].push({
        ...hPlateGenV2(lowerflange2, lPoint, diaSection.flangeThickness, 0, 90, 0, gradRadian, lowerflange, false, [0, 1], true),
        meta: { part: gridkey, key: "lowerflange", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: {},
        textLabel: {},
        dimension: {},
    });
    let joint = IbeamJointV2(webPlate, point, diaSection, wBolt, fBolt);
    for (let i in joint) {
        result["children"].push({
            ...joint[i],
            meta: { part: gridkey, key: i, girder: point.girderNum, seg: point.segNum },
            properties: {}, //볼트의 경우 볼트 프로퍼티를 받아와야 할 필요가 있음
            weld: {},
            textLabel: {},
            dimension: {},
        });
    }

    let data = [
        PointToGlobal(point, { x: (lowerPlate[0].x + tl.x) / 2, y: (lowerPlate[0].y + tl.y) / 2, z: 0 }),
        PointToGlobal(point, { x: (lowerPlate[3].x + tr.x) / 2, y: (lowerPlate[3].y + tr.y) / 2, z: 0 }),
    ];

    let section = [
        diaSection.flangeWidth,
        diaSection.flangeThickness,
        diaSection.flangeWidth,
        diaSection.flangeThickness,
        diaSection.webHeight,
        diaSection.webThickness,
        diaSection.stiffThickness,
        diaSection.stiffWidth,
    ];
    let sd = SectionDimension(sectionPoint);
    diaSection["totalHeight"] = diaHeight;
    let sectionID = sectionPoint.input.wuf.toFixed(0)
                    +sectionPoint.input.wlf.toFixed(0)
                    +sectionPoint.input.tlf.toFixed(0)
                    +sectionPoint.input.tuf.toFixed(0)
                    +sectionPoint.input.tw.toFixed(0);
    let parent = {
        part: gridkey,
        id:
            sectionID + 
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        inode: gridkey + "L",
        jnode: gridkey + "R",
        key: gridkey + "X",
        isKframe: false,
        data: data,
        section: section,
        diaSection,
        properties: {},
        model: {
            sectionView: sectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                {
                    type: "DIMALIGN",
                    points: [sd.top[0], sd.top[sd.top.length - 1]],
                    index: sd.topIndex ? 0 : 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 2,
                },
                {
                    type: "DIMALIGN",
                    points: sd.top,
                    index: sd.topIndex ? 0 : sd.top.length - 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 1,
                },
                {
                    type: "DIMALIGN",
                    points: [sd.bottom[0], sd.bottom[sd.bottom.length - 1]],
                    index: 0,
                    isHorizontal: true,
                    isTopOrRight: false,
                    offsetIndex: 2,
                },
                { type: "DIMALIGN", points: sd.bottom, index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 1 },
                { type: "DIMALIGN", points: sd.left, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
                // { type: "DIMALIGN", points: [...sd.left, ...sectionLeftDimPoints], index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                { type: "DIMALIGN", points: sd.right, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 4 },
                // { type: "DIMALIGN", points: [...sd.right, ...sectionRightDimPoints], index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
        },
    };
    result["parent"].push(parent);
    return result;
}

export function DYdia2V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    let result = {
        parent: [],
        children: [],
    };
    // let diaSection = {
    //     "lowerHeight": 300,
    //     "flangeThickness": 12,
    //     "flangeWidth": 250,
    //     "upperHeight" : 900,
    //     "webThickness" : 12,
    //     "stiffWidth": 150,
    //     "stiffThickness" : 12,
    //     "scallopRadius": 35,
    //     "bracketWidth": 450,
    //     "bracketLength": 529,
    //     "bracketScallopR": 100,
    //     "webJointWidth": 330,
    //     "webJointHeight": 440,
    //     "webJointThickness": 10,
    //     "flangeJointLength": 480,
    //     "flangeJointWidth": 80,
    //     "flangeJointThickness": 10
    // } //  임시 입력변수

    let wBolt = {
        P: 90,
        G: 75,
        pNum: 5,
        gNum: 2,
        size: 37,
        dia: 22,
        t: 14,
    };
    let fBolt = {
        P: 170,
        G: 75,
        pNum: 2,
        gNum: 3,
        dia: 22,
        size: 37,
        t: 14,
    };
    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    // const rotationY = (point.skew - 90) * Math.PI / 180
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);

    ///lower stiffener
    let lowerPlate = [
        { x: bl.x + lwCot * diaSection.lowerHeight, y: bl.y + diaSection.lowerHeight },
        { x: bl.x + lwCot * (diaSection.lowerHeight - diaSection.flangeThickness), y: bl.y + diaSection.lowerHeight - diaSection.flangeThickness },
        { x: br.x + rwCot * (diaSection.lowerHeight - diaSection.flangeThickness), y: br.y + diaSection.lowerHeight - diaSection.flangeThickness },
        { x: br.x + rwCot * diaSection.lowerHeight, y: br.y + diaSection.lowerHeight },
    ];
    let upperPlate = [
        { x: bl.x + lwCot * diaSection.upperHeight, y: bl.y + diaSection.upperHeight },
        { x: bl.x + lwCot * (diaSection.upperHeight + diaSection.flangeThickness), y: bl.y + diaSection.upperHeight + diaSection.flangeThickness },
        { x: br.x + rwCot * (diaSection.upperHeight + diaSection.flangeThickness), y: br.y + diaSection.upperHeight + diaSection.flangeThickness },
        { x: br.x + rwCot * diaSection.upperHeight, y: br.y + diaSection.upperHeight },
    ];
    let bracketPoint = [
        PointToGlobal(point, lowerPlate[1]),
        PointToGlobal(point, lowerPlate[2]),
        PointToGlobal(point, upperPlate[0]),
        PointToGlobal(point, upperPlate[3]),
    ];
    let bracketSide = [
        [lowerPlate[0], lowerPlate[1]],
        [lowerPlate[3], lowerPlate[2]],
        [upperPlate[1], upperPlate[0]],
        [upperPlate[2], upperPlate[3]],
    ];
    for (let i = 0; i < 4; i++) {
        let sign = i % 2 === 0 ? 1 : -1;
        let bracket2D = PlateRestPoint(bracketSide[i][0], bracketSide[i][1], 0, 0, sign * diaSection.bracketLength);
        let lowerbracket1 = [
            { x: 0, y: diaSection.bracketWidth / 2 },
            { x: sign * 20, y: diaSection.bracketWidth / 2 },
            { x: sign * 20, y: diaSection.flangeWidth / 2 },
            { x: sign * diaSection.bracketLength, y: diaSection.flangeWidth / 2 },
            { x: sign * diaSection.bracketLength, y: -diaSection.flangeWidth / 2 },
            { x: sign * 20, y: -diaSection.flangeWidth / 2 },
            { x: sign * 20, y: -diaSection.bracketWidth / 2 },
            { x: 0, y: -diaSection.bracketWidth / 2 },
        ];
        let bracketShape = [
            lowerbracket1[0],
            lowerbracket1[1],
            ...GetArcPoints(lowerbracket1[1], lowerbracket1[2], lowerbracket1[3], diaSection.bracketScallopR, 4),
            lowerbracket1[3],
            lowerbracket1[4],
            ...GetArcPoints(lowerbracket1[4], lowerbracket1[5], lowerbracket1[6], diaSection.bracketScallopR, 4),
            lowerbracket1[6],
            lowerbracket1[7],
        ];
        let thickness = i < 2 ? diaSection.flangeThickness : diaSection.flangeThickness;
        let top2D = i < 2 ? false : true;
        // result["bracket" + i.toFixed(0)] = hPlateGenV2(bracketShape, bracketPoint[i], thickness, 0, point.skew, 0, 0, bracket2D, top2D, null, !top2D);
        result["children"].push({
            ...hPlateGenV2(bracketShape, bracketPoint[i], thickness, 0, point.skew, 0, 0, bracket2D, top2D, null, !top2D),
            meta: { part: gridkey, key: "bracket" + i.toFixed(0), girder: point.girderNum, seg: point.segNum },
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.flangeThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[lowerbracket1[0], lowerbracket1[7]]],
                    sectionView: {
                        point: bracketSide[i][0],
                        isUpper: true,
                        isRight: true,
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
            ],
            textLabel: {},
            dimension: {},
        });
    }
    let stiffnerPoint = [
        [bl, lowerPlate[1]],
        [br, lowerPlate[2]],
        [tl, upperPlate[1]],
        [tr, upperPlate[2]],
    ];
    for (let i = 0; i < 4; i++) {
        let stiffWidth = i % 2 === 0 ? diaSection.stiffWidth : -diaSection.stiffWidth;
        let tan1 = i < 2 ? 0 : gradient;
        let stiffner = PlateRestPoint(stiffnerPoint[i][0], stiffnerPoint[i][1], tan1, 0, stiffWidth);
        let side2D = i % 2 === 0 ? null : [0, 3, 2, 1];
        let t2 = i < 2 ? sectionPoint.input.tlf : sectionPoint.input.tuf;
        // result["stiffner" + i.toFixed(0)] = vPlateGenV2(stiffner, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], null, side2D)
        result["children"].push({
            ...vPlateGenV2(stiffner, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], null, side2D),
            meta: { part: gridkey, key: "stiffner" + i.toFixed(0), girder: point.girderNum, seg: point.segNum },
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[stiffner[0], stiffner[1]]],
                    sectionView: {
                        point: WeldingPoint([stiffner[0], stiffner[1]], 0.5),
                        isUpper: true,
                        isRight: true,
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: t2,
                    line: [[stiffner[0], stiffner[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: diaSection.flangeThickness,
                    line: [[stiffner[1], stiffner[2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        });
    }

    let webBracketPoint = [
        [lowerPlate[0], upperPlate[0]],
        [lowerPlate[3], upperPlate[3]],
    ];
    for (let i = 0; i < 2; i++) {
        let stiffWidth = i % 2 === 0 ? diaSection.bracketLength : -diaSection.bracketLength;
        let stiffner = PlateRestPoint(webBracketPoint[i][0], webBracketPoint[i][1], 0, 0, stiffWidth);
        // result["webBracket" + i.toFixed(0)] = vPlateGenV2(stiffner, point, diaSection.webThickness, [0, 1], diaSection.scallopRadius, null, null, [], [1, 2], null, [0, 3])
        result["children"].push({
            ...vPlateGenV2(stiffner, point, diaSection.webThickness, [0, 1], diaSection.scallopRadius, null, null, [], [1, 2], null, [0, 3]),
            meta: { part: gridkey, key: "webBracket" + i.toFixed(0), girder: point.girderNum, seg: point.segNum },
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[stiffner[0], stiffner[1]]],
                    sectionView: {
                        point: WeldingPoint([stiffner[0], stiffner[1]], 0.5),
                        isUpper: true,
                        isRight: true,
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: diaSection.flangeThickness,
                    line: [[stiffner[0], stiffner[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: diaSection.flangeThickness,
                    line: [[stiffner[1], stiffner[2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        });
    }

    let webPlate = [
        { x: lowerPlate[0].x + diaSection.bracketLength, y: lowerPlate[0].y },
        { x: lowerPlate[3].x - diaSection.bracketLength, y: lowerPlate[3].y },
        { x: upperPlate[3].x - diaSection.bracketLength, y: upperPlate[3].y },
        { x: upperPlate[0].x + diaSection.bracketLength, y: upperPlate[0].y },
    ];

    // result["webPlate"] = vPlateGenV2(webPlate, point, diaSection.webThickness, [], 0, null, null, [], [2, 3], [0, 1, 2, 3], [0, 1])
    result["children"].push({
        ...vPlateGenV2(webPlate, point, diaSection.webThickness, [], 0, null, null, [], [2, 3], [0, 1, 2, 3], [0, 1]),
        meta: { part: gridkey, key: "webPlate", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.flangeThickness,
                line: [[webPlate[0], webPlate[1]]],
                sectionView: {
                    point: WeldingPoint([webPlate[0], webPlate[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.flangeThickness,
                line: [[webPlate[2], webPlate[3]]],
                sectionView: {
                    point: WeldingPoint([webPlate[2], webPlate[3]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let upperflange = [
        { x: upperPlate[0].x + diaSection.bracketLength, y: upperPlate[0].y },
        { x: upperPlate[0].x + diaSection.bracketLength, y: upperPlate[0].y + diaSection.flangeThickness },
        { x: upperPlate[3].x - diaSection.bracketLength, y: upperPlate[3].y + diaSection.flangeThickness },
        { x: upperPlate[3].x - diaSection.bracketLength, y: upperPlate[3].y },
    ];
    let uPoint = PointToGlobal(point, upperflange[0]);
    let upperflangeL = upperPlate[3].x - upperPlate[0].x - 2 * diaSection.bracketLength;
    let upperflange2 = [
        { x: 0, y: diaSection.flangeWidth / 2 },
        { x: 0, y: -diaSection.flangeWidth / 2 },
        { x: upperflangeL, y: -diaSection.flangeWidth / 2 },
        { x: upperflangeL, y: diaSection.flangeWidth / 2 },
    ];
    // result["upperflange"] = hPlateGenV2(upperflange2, uPoint, diaSection.flangeThickness, 0, point.skew, 0, 0, upperflange, true, [0, 1])
    result["children"].push({
        ...(upperflange2, uPoint, diaSection.flangeThickness, 0, point.skew, 0, 0, upperflange, true, [0, 1]),
        meta: { part: gridkey, key: "upperflange", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: {},
        textLabel: {},
        dimension: {},
    });
    // { points: upperflange, Thickness: dsi.flangeWidth, z: - dsi.flangeWidth / 2, rotationX: Math.PI / 2, rotationY: rotationY, hole: [], }
    let lowerflange = [
        { x: lowerPlate[0].x + diaSection.bracketLength, y: lowerPlate[0].y },
        { x: lowerPlate[0].x + diaSection.bracketLength, y: lowerPlate[0].y - diaSection.flangeThickness },
        { x: lowerPlate[3].x - diaSection.bracketLength, y: lowerPlate[3].y - diaSection.flangeThickness },
        { x: lowerPlate[3].x - diaSection.bracketLength, y: lowerPlate[3].y },
    ];
    let lPoint = PointToGlobal(point, lowerflange[1]);
    let lowerflangeL = lowerflange[3].x - lowerflange[0].x;
    let lowerflange2 = [
        { x: 0, y: diaSection.flangeWidth / 2 },
        { x: 0, y: -diaSection.flangeWidth / 2 },
        { x: lowerflangeL, y: -diaSection.flangeWidth / 2 },
        { x: lowerflangeL, y: diaSection.flangeWidth / 2 },
    ];
    // result["lowerflange"] = hPlateGenV2(lowerflange2, lPoint, diaSection.flangeThickness, 0, point.skew, 0, 0, lowerflange, false, [0, 1], true)
    // { points: lowerflange, Thickness: dsi.flangeWidth, z: - dsi.flangeWidth / 2, rotationX: Math.PI / 2, rotationY: rotationY, hole: [], }
    result["children"].push({
        ...hPlateGenV2(lowerflange2, lPoint, diaSection.flangeThickness, 0, point.skew, 0, 0, lowerflange, false, [0, 1], true),
        meta: { part: gridkey, key: "lowerflange", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: {},
        textLabel: {},
        dimension: {},
    });
    let joint = IbeamJointV2(webPlate, point, diaSection, wBolt, fBolt);
    for (let i in joint) {
        result["children"].push({
            ...joint[i],
            meta: { part: gridkey, key: i, girder: point.girderNum, seg: point.segNum },
            properties: {}, //볼트의 경우 볼트 프로퍼티를 받아와야 할 필요가 있음
            weld: {},
            textLabel: {},
            dimension: {},
        });
    }
    let sd = SectionDimension(sectionPoint);
    let sectionID = sectionPoint.input.wuf.toFixed(0)
                    +sectionPoint.input.wlf.toFixed(0)
                    +sectionPoint.input.tlf.toFixed(0)
                    +sectionPoint.input.tuf.toFixed(0)
                    +sectionPoint.input.tw.toFixed(0);
    let parent = {
        part: gridkey,
        id:
            sectionID + 
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        inode: gridkey + "L",
        jnode: gridkey + "R",
        key: gridkey + "X",
        isKframe: false,
        // data: data,
        // section: section,
        properties: {},
        model: {
            sectionView: sectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                {
                    type: "DIMALIGN",
                    points: [sd.top[0], sd.top[sd.top.length - 1]],
                    index: sd.topIndex ? 0 : 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 2,
                },
                {
                    type: "DIMALIGN",
                    points: sd.top,
                    index: sd.topIndex ? 0 : sd.top.length - 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 1,
                },
                {
                    type: "DIMALIGN",
                    points: [sd.bottom[0], sd.bottom[sd.bottom.length - 1]],
                    index: 0,
                    isHorizontal: true,
                    isTopOrRight: false,
                    offsetIndex: 2,
                },
                { type: "DIMALIGN", points: sd.bottom, index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 1 },
                { type: "DIMALIGN", points: sd.left, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
                // { type: "DIMALIGN", points: [...sd.left, ...sectionLeftDimPoints], index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                { type: "DIMALIGN", points: sd.right, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 4 },
                // { type: "DIMALIGN", points: [...sd.right, ...sectionRightDimPoints], index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
        },
    };
    result["parent"].push(parent);
    return result;
}

export function DYdia0V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    let result = {
        parent: [],
        children: [],
    };
    // let diaSection = {
    //     "lowerThickness": 12,
    //     "lowerWidth": 250,
    //     "webHeight": 576,
    //     "upperThickness": 12,
    //     "upperWidth" : 250,
    //     "webThickness" : 12,
    //     "stiffWidth" : 150,
    //     "stiffWidth2" : 300,
    //     "filletR" : 200,
    //     "stiffThickness": 12,
    //     "scallopRadius": 35
    // } //  임시 입력변수

    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    let lflangePoint = sectionPoint.lflange;
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    // const rotationY = (skew - 90) * Math.PI / 180
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);
    let diaHeight = tl.y - gradient * tr.x - bl.y;
    ///lower stiffener
    let lflangeModel = {};
    if (lflangePoint[0].length > 0) {
        let lowerPlate = [
            lflangePoint[0][1],
            { x: lflangePoint[0][1].x, y: lflangePoint[0][1].y - diaSection.lowerThickness },
            { x: lflangePoint[1][1].x, y: lflangePoint[1][1].y - diaSection.lowerThickness },
            lflangePoint[1][1],
        ];
        let lowerPlateL = lflangePoint[1][1].x - lflangePoint[0][1].x;
        let lowerPlate2 = [
            { x: 0, y: diaSection.lowerWidth / 2 },
            { x: 0, y: -diaSection.lowerWidth / 2 },
            { x: lowerPlateL, y: -diaSection.lowerWidth / 2 },
            { x: lowerPlateL, y: diaSection.lowerWidth / 2 },
        ];
        let lPoint = PointToGlobal(point, lflangePoint[0][1]);
        lflangeModel = hPlateGenV2(
            lowerPlate2,
            lPoint,
            diaSection.lowerThickness,
            -diaSection.lowerThickness,
            point.skew,
            0,
            0,
            lowerPlate,
            false,
            [0, 1],
            true
        );
        // result["lowerflange"] = hPlateGenV2(lowerPlate2, lPoint, diaSection.lowerThickness, - diaSection.lowerThickness, point.skew, 0, 0, lowerPlate, false, [0, 1], true)
        result["children"].push({
            ...lflangeModel,
            meta: { part: gridkey, key: "lowerflange", girder: point.girderNum, seg: point.segNum },
            properties: {},
            weld: [
                {
                    type: "B",
                    thickness1: diaSection.lowerThickness,
                    thickness2: sectionPoint.input.tlf,
                    line: [[lowerPlate2[0], lowerPlate2[1]]],
                    sectionView: {
                        point: lowerPlate[0],
                        isUpper: true,
                        isRight: true,
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
                {
                    type: "B",
                    thickness1: diaSection.lowerThickness,
                    thickness2: sectionPoint.input.tlf,
                    line: [[lowerPlate2[2], lowerPlate2[3]]],
                    sectionView: {
                        point: lowerPlate[3],
                        isUpper: true,
                        isRight: false,
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
            ],
            textLabel: {},
            dimension: {},
        });
    }

    let upperPlate = [
        { x: bl.x + lwCot * diaSection.webHeight, y: bl.y + diaSection.webHeight },
        { x: bl.x + lwCot * (diaSection.webHeight + diaSection.upperThickness), y: bl.y + diaSection.webHeight + diaSection.upperThickness },
        { x: br.x + rwCot * (diaSection.webHeight + diaSection.upperThickness), y: br.y + diaSection.webHeight + diaSection.upperThickness },
        { x: br.x + rwCot * diaSection.webHeight, y: br.y + diaSection.webHeight },
    ];
    let upperPlateL = upperPlate[3].x - upperPlate[0].x;
    let upperPlate2 = [
        { x: 0, y: diaSection.upperWidth / 2 },
        { x: 0, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: diaSection.upperWidth / 2 },
    ];
    let uPoint = PointToGlobal(point, upperPlate[0]);
    // result["upperflange"] = hPlateGenV2(upperPlate2, uPoint, diaSection.upperThickness, 0, point.skew, 0, 0, upperPlate, true, [0, 1])
    let uflangeModel = hPlateGenV2(upperPlate2, uPoint, diaSection.upperThickness, 0, point.skew, 0, 0, upperPlate, true, [0, 1]);

    result["children"].push({
        ...uflangeModel,
        meta: { part: gridkey, key: "upperflange", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.upperThickness,
                thickness2: sectionPoint.input.tw,
                line: [[upperPlate2[0], upperPlate2[1]]],
                sectionView: {
                    point: upperPlate[0],
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.upperThickness,
                thickness2: sectionPoint.input.tw,
                line: [[upperPlate2[2], upperPlate2[3]]],
                sectionView: {
                    point: upperPlate[3],
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let centerPlate = [bl, br, upperPlate[3], upperPlate[0]];
    // result["webPlate"] = vPlateGenV2(centerPlate, point, diaSection.webThickness, [0, 1, 2, 3], diaSection.scallopRadius, null, null, [], [2, 3], [0, 1, 2, 3], [0, 1])
    let webPlateModel = vPlateGenV2(
        centerPlate,
        point,
        diaSection.webThickness,
        [0, 1, 2, 3],
        diaSection.scallopRadius,
        null,
        null,
        [],
        [2, 3],
        [0, 1, 2, 3],
        [0, 1]
    );

    result["children"].push({
        ...webPlateModel,
        meta: { part: gridkey, key: "webPlate", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[centerPlate[0], centerPlate[3]]],
                sectionView: {
                    point: WeldingPoint([centerPlate[0], centerPlate[3]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[centerPlate[1], centerPlate[2]]],
                sectionView: {
                    point: WeldingPoint([centerPlate[1], centerPlate[2]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.upperThickness,
                line: [[centerPlate[2], centerPlate[3]]],
                sectionView: {
                    point: WeldingPoint([centerPlate[2], centerPlate[3]], 0.5),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.lowerThickness,
                line: [[centerPlate[0], centerPlate[1]]],
                sectionView: {
                    point: WeldingPoint([centerPlate[0], centerPlate[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });

    let stiffnerPoint = [tl, upperPlate[1]];
    let stiffWidth = diaSection.stiffWidth;
    let tan1 = gradient;
    let stiffner = PlateRestPoint(stiffnerPoint[0], stiffnerPoint[1], tan1, 0, stiffWidth);
    let addedPoint = [
        { x: upperPlate[1].x + diaSection.stiffWidth2, y: upperPlate[1].y },
        { x: upperPlate[1].x + diaSection.stiffWidth2, y: upperPlate[1].y + 50 },
        { x: upperPlate[1].x + diaSection.stiffWidth, y: upperPlate[1].y + 50 + diaSection.stiffWidth2 - diaSection.stiffWidth },
    ];

    let stiffnerPoints = [];
    stiffnerPoints.push(...scallop(stiffner[3], stiffner[0], stiffner[1], diaSection.scallopRadius, 4));
    stiffnerPoints.push(...scallop(stiffner[0], stiffner[1], stiffner[2], diaSection.scallopRadius, 4));
    stiffnerPoints.push(addedPoint[0], addedPoint[1]);
    stiffnerPoints.push(...GetArcPoints(addedPoint[1], addedPoint[2], stiffner[3], diaSection.filletR, 4));
    stiffnerPoints.push(stiffner[3]);
    // result["stiffner2"] = vPlateGenV2(stiffnerPoints, point, diaSection.stiffThickness, [], diaSection.scallopRadius, null, null, []);
    result["children"].push({
        ...vPlateGenV2(stiffnerPoints, point, diaSection.stiffThickness, [], diaSection.scallopRadius, null, null, []),
        meta: { part: gridkey, key: "stiffner2", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[stiffner[0], stiffner[1]]],
                sectionView: {
                    point: WeldingPoint([stiffner[0], stiffner[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: sectionPoint.input.tuf,
                line: [[stiffner[0], stiffner[3]]],
            },
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: diaSection.upperThickness,
                line: [[stiffner[1], stiffner[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    });
    stiffnerPoint = [tr, upperPlate[2]];
    tan1 = gradient;
    stiffner = PlateRestPoint(stiffnerPoint[0], stiffnerPoint[1], tan1, 0, -stiffWidth);
    addedPoint = [
        { x: upperPlate[2].x - diaSection.stiffWidth2, y: upperPlate[2].y },
        { x: upperPlate[2].x - diaSection.stiffWidth2, y: upperPlate[2].y + 50 },
        { x: upperPlate[2].x - diaSection.stiffWidth, y: upperPlate[2].y + 50 + diaSection.stiffWidth2 - diaSection.stiffWidth },
    ];
    stiffnerPoints = [];
    stiffnerPoints.push(stiffner[0]);
    stiffnerPoints.push(stiffner[1]);
    stiffnerPoints.push(addedPoint[0], addedPoint[1]);
    stiffnerPoints.push(...GetArcPoints(addedPoint[1], addedPoint[2], stiffner[3], diaSection.filletR, 4));
    stiffnerPoints.push(stiffner[3]);
    // result["stiffner3"] = vPlateGenV2(stiffnerPoints, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], null, [1, 2, 10, 0]);
    result["children"].push({
        ...vPlateGenV2(stiffnerPoints, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], null, [1, 2, 10, 0]),
        meta: { part: gridkey, key: "stiffner3", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: sectionPoint.input.tw,
                line: [[stiffner[0], stiffner[1]]],
                sectionView: {
                    point: WeldingPoint([stiffner[0], stiffner[1]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: sectionPoint.input.tuf,
                line: [[stiffner[0], stiffner[3]]],
            },
            {
                type: "FF",
                thickness1: diaSection.stiffThickness,
                thickness2: diaSection.upperThickness,
                line: [[stiffner[1], stiffner[2]]],
            },
        ],
        textLabel: {},
        dimension: {},
    });

    let data = [
        PointToGlobal(point, { x: (bl.x + upperPlate[0].x) / 2, y: (bl.y + upperPlate[0].y) / 2, z: 0 }),
        PointToGlobal(point, { x: (br.x + upperPlate[3].x) / 2, y: (br.y + upperPlate[3].y) / 2, z: 0 }),
    ];

    let section = [
        diaSection.lowerWidth,
        diaSection.lowerThickness,
        diaSection.upperWidth,
        diaSection.upperThickness,
        diaSection.webHeight,
        diaSection.webThickness,
        diaSection.stiffThickness,
        diaSection.stiffWidth,
    ];

    // console.log(lflangeModel, webPlateModel, uflangeModel)
    let topLeftDimPoints = [
        uflangeModel["model"]["topView"][0],
        webPlateModel["model"]["topView"][0],
        webPlateModel["model"]["topView"][1],
        uflangeModel["model"]["topView"][1],
    ];

    let topRightDimPoints = [
        uflangeModel["model"]["topView"][3],
        webPlateModel["model"]["topView"][3],
        webPlateModel["model"]["topView"][2],
        uflangeModel["model"]["topView"][2],
    ];
    let bottomLeftDimPoints = [webPlateModel["model"]["bottomView"][0], webPlateModel["model"]["bottomView"][1]];
    let bottomRightDimPoints = [webPlateModel["model"]["bottomView"][3], webPlateModel["model"]["bottomView"][2]];
    if (lflangeModel["model"]) {
        bottomLeftDimPoints = [
            lflangeModel["model"]["bottomView"][0],
            webPlateModel["model"]["bottomView"][0],
            webPlateModel["model"]["bottomView"][1],
            lflangeModel["model"]["bottomView"][1],
        ];
        bottomRightDimPoints = [
            lflangeModel["model"]["bottomView"][3],
            webPlateModel["model"]["bottomView"][3],
            webPlateModel["model"]["bottomView"][2],
            lflangeModel["model"]["bottomView"][2],
        ];
    }

    let sectionLeftDimPoints = [upperPlate[0], upperPlate[1]];
    let sectionRightDimPoints = [upperPlate[2], upperPlate[3]];

    let sd = SectionDimension(sectionPoint);
    diaSection["totalHeight"] = diaHeight;
    let sectionID = sectionPoint.input.wuf.toFixed(0)
                    +sectionPoint.input.wlf.toFixed(0)
                    +sectionPoint.input.tlf.toFixed(0)
                    +sectionPoint.input.tuf.toFixed(0)
                    +sectionPoint.input.tw.toFixed(0);
    let parent = {
        part: gridkey,
        id:
            sectionID + 
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        inode: gridkey + "L",
        jnode: gridkey + "R",
        key: gridkey + "X",
        isKframe: false,
        data: data,
        section: section,
        diaSection,
        properties: {},
        model: {
            sectionView: sectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                {
                    type: "DIMALIGN",
                    points: [sd.top[0], sd.top[sd.top.length - 1]],
                    index: sd.topIndex ? 0 : 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 2,
                },
                {
                    type: "DIMALIGN",
                    points: sd.top,
                    index: sd.topIndex ? 0 : sd.top.length - 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 1,
                },
                {
                    type: "DIMALIGN",
                    points: [sd.bottom[0], sd.bottom[sd.bottom.length - 1]],
                    index: 0,
                    isHorizontal: true,
                    isTopOrRight: false,
                    offsetIndex: 2,
                },
                { type: "DIMALIGN", points: sd.bottom, index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 1 },
                { type: "DIMALIGN", points: sd.left, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
                {
                    type: "DIMALIGN",
                    points: [...sd.left, ...sectionLeftDimPoints],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 3,
                },
                { type: "DIMALIGN", points: sd.right, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 4 },
                {
                    type: "DIMALIGN",
                    points: [...sd.right, ...sectionRightDimPoints],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 3,
                },
            ],
            topView: [
                {
                    type: "DIMALIGN",
                    points: [topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                {
                    type: "DIMALIGN",
                    points: [topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
            bottomView: [
                {
                    type: "DIMALIGN",
                    points: [bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: bottomLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                {
                    type: "DIMALIGN",
                    points: [bottomRightDimPoints[0], bottomRightDimPoints[bottomRightDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: bottomRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
        },
    };
    result["parent"].push(parent);
    return result;
}

export function DYdia1V2(sectionPoint, point, diaSection, gridkey, diaSectionName) {
    //ds 입력변수
    let result = {
        parent: [],
        children: [],
    };
    // let diaSection = {
    //     "lowerHeight": 300,
    //     "lowerThickness": 12,
    //     "lowerWidth": 250,
    //     "upperHeight": 900,
    //     "upperThickness": 12,
    //     "upperWidth": 250,
    //     "webThickness": 12,
    //     "stiffWidth": 150,
    //     "stiffThickness": 12,
    //     "scallopRadius": 35
    // } //  임시 입력변수

    // const topY = 270; // 슬래브두께 + 헌치값이 포함된 값. 우선 변수만 입력
    const bl = sectionPoint.web[0][0];
    const tl = sectionPoint.web[0][1];
    const br = sectionPoint.web[1][0];
    const tr = sectionPoint.web[1][1];
    // const rotationY = (skew - 90) * Math.PI / 180
    const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
    const rwCot = (tr.x - br.x) / (tr.y - br.y);
    const gradient = (tr.y - tl.y) / (tr.x - tl.x);

    let diaHeight = tl.y - gradient * tr.x - bl.y;
    ///lower stiffener
    let lowerPlate = [
        { x: bl.x + lwCot * diaSection.lowerHeight, y: bl.y + diaSection.lowerHeight },
        { x: bl.x + lwCot * (diaSection.lowerHeight - diaSection.lowerThickness), y: bl.y + diaSection.lowerHeight - diaSection.lowerThickness },
        { x: br.x + rwCot * (diaSection.lowerHeight - diaSection.lowerThickness), y: br.y + diaSection.lowerHeight - diaSection.lowerThickness },
        { x: br.x + rwCot * diaSection.lowerHeight, y: br.y + diaSection.lowerHeight },
    ];
    let lowerPlateL = lowerPlate[3].x - lowerPlate[0].x;
    let lowerPlate2 = [
        { x: 0, y: diaSection.lowerWidth / 2 },
        { x: 0, y: -diaSection.lowerWidth / 2 },
        { x: lowerPlateL, y: -diaSection.lowerWidth / 2 },
        { x: lowerPlateL, y: diaSection.lowerWidth / 2 },
    ];
    let lPoint = PointToGlobal(point, lowerPlate[0]);
    // result["lowerflange"] = hPlateGenV2(lowerPlate2, lPoint, diaSection.lowerThickness, -diaSection.lowerThickness, point.skew, 0, 0, lowerPlate, false, [0, 1], true);
    let lflangeModel = hPlateGenV2(
        lowerPlate2,
        lPoint,
        diaSection.lowerThickness,
        -diaSection.lowerThickness,
        point.skew,
        0,
        0,
        lowerPlate,
        false,
        [0, 1],
        true
    );
    result["children"].push({
        ...lflangeModel,
        meta: { part: gridkey, key: "lowerflange", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.lowerThickness,
                thickness2: sectionPoint.input.tw,
                line: [[lowerPlate2[0], lowerPlate2[1]]],
                sectionView: {
                    point: lowerPlate[0],
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.lowerThickness,
                thickness2: sectionPoint.input.tw,
                line: [[lowerPlate2[2], lowerPlate2[3]]],
                sectionView: {
                    point: lowerPlate[3],
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let upperPlate = [
        { x: bl.x + lwCot * diaSection.upperHeight, y: bl.y + diaSection.upperHeight },
        { x: bl.x + lwCot * (diaSection.upperHeight + diaSection.upperThickness), y: bl.y + diaSection.upperHeight + diaSection.upperThickness },
        { x: br.x + rwCot * (diaSection.upperHeight + diaSection.upperThickness), y: br.y + diaSection.upperHeight + diaSection.upperThickness },
        { x: br.x + rwCot * diaSection.upperHeight, y: br.y + diaSection.upperHeight },
    ];
    let upperPlateL = upperPlate[3].x - upperPlate[0].x;
    let upperPlate2 = [
        { x: 0, y: diaSection.upperWidth / 2 },
        { x: 0, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: -diaSection.upperWidth / 2 },
        { x: upperPlateL, y: diaSection.upperWidth / 2 },
    ];
    let uPoint = PointToGlobal(point, upperPlate[0]);
    // result["upperflange"] = hPlateGenV2(upperPlate2, uPoint, diaSection.upperThickness, 0, point.skew, 0, 0, upperPlate, true, [0, 1])
    let uflangeModel = hPlateGenV2(upperPlate2, uPoint, diaSection.upperThickness, 0, point.skew, 0, 0, upperPlate, true, [0, 1]);
    result["children"].push({
        ...uflangeModel,
        meta: { part: gridkey, key: "upperflange", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.upperThickness,
                thickness2: sectionPoint.input.tw,
                line: [[upperPlate2[0], upperPlate2[1]]],
                sectionView: {
                    point: upperPlate[0],
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.upperThickness,
                thickness2: sectionPoint.input.tw,
                line: [[upperPlate2[2], upperPlate2[3]]],
                sectionView: {
                    point: upperPlate[3],
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });
    let centerPlate = [lowerPlate[0], lowerPlate[3], upperPlate[3], upperPlate[0]];
    // result["webPlate"] = vPlateGenV2(centerPlate, point, diaSection.webThickness, [0, 1, 2, 3], diaSection.scallopRadius, null, null, [], [2, 3], [0, 1, 2, 3], [0, 1])
    let webPlateModel = vPlateGenV2(
        centerPlate,
        point,
        diaSection.webThickness,
        [0, 1, 2, 3],
        diaSection.scallopRadius,
        null,
        null,
        [],
        [2, 3],
        [0, 1, 2, 3],
        [0, 1]
    );
    result["children"].push({
        ...webPlateModel,
        meta: { part: gridkey, key: "webPlate", girder: point.girderNum, seg: point.segNum },
        properties: {},
        weld: [
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[centerPlate[0], centerPlate[3]]],
                sectionView: {
                    point: WeldingPoint([centerPlate[0], centerPlate[3]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: sectionPoint.input.tw,
                line: [[centerPlate[1], centerPlate[2]]],
                sectionView: {
                    point: WeldingPoint([centerPlate[1], centerPlate[2]], 0.5),
                    isUpper: true,
                    isRight: false,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.upperThickness,
                line: [[centerPlate[2], centerPlate[3]]],
                sectionView: {
                    point: WeldingPoint([centerPlate[2], centerPlate[3]], 0.5),
                    isUpper: false,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
            {
                type: "FF",
                thickness1: diaSection.webThickness,
                thickness2: diaSection.lowerThickness,
                line: [[centerPlate[0], centerPlate[1]]],
                sectionView: {
                    point: WeldingPoint([centerPlate[0], centerPlate[1]], 0.5),
                    isUpper: true,
                    isRight: true,
                    isXReverse: false,
                    isYReverse: false,
                },
            },
        ],
        textLabel: {},
        dimension: {},
    });

    let stiffnerPoint = [
        [bl, lowerPlate[1]],
        [br, lowerPlate[2]],
        [tl, upperPlate[1]],
        [tr, upperPlate[2]],
    ];
    let isUpper = [false, false, true, true];
    let isRight = [true, false, true, false];
    for (let i = 0; i < 4; i++) {
        let stiffWidth = i % 2 === 0 ? diaSection.stiffWidth : -diaSection.stiffWidth;
        let tan1 = i < 2 ? 0 : gradient;
        let stiffner = PlateRestPoint(stiffnerPoint[i][0], stiffnerPoint[i][1], tan1, 0, stiffWidth);
        let side2D = i % 2 === 0 ? [0, 3, 2, 1] : null;
        // result["stiffner" + i.toFixed(0)] = vPlateGenV2(stiffner, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], null, side2D)
        let t2 = i < 2 ? sectionPoint.input.tlf : sectionPoint.input.tuf;
        let t3 = i < 2 ? diaSection.lowerThickness : diaSection.upperThickness;

        result["children"].push({
            ...vPlateGenV2(stiffner, point, diaSection.stiffThickness, [0, 1], diaSection.scallopRadius, null, null, [], null, side2D),
            meta: { part: gridkey, key: "stiffner" + i.toFixed(0), girder: point.girderNum, seg: point.segNum },
            properties: {},
            weld: [
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: sectionPoint.input.tw,
                    line: [[stiffner[0], stiffner[1]]],
                    sectionView: {
                        point: WeldingPoint([stiffner[0], stiffner[1]], 0.5),
                        isUpper: isUpper[i],
                        isRight: isRight[i],
                        isXReverse: false,
                        isYReverse: false,
                    },
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: t2,
                    line: [[stiffner[0], stiffner[3]]],
                },
                {
                    type: "FF",
                    thickness1: diaSection.stiffThickness,
                    thickness2: t3,
                    line: [[stiffner[1], stiffner[2]]],
                },
            ],
            textLabel: {},
            dimension: {},
        });
    }
    let data = [
        PointToGlobal(point, { x: (lowerPlate[0].x + upperPlate[0].x) / 2, y: (lowerPlate[0].y + upperPlate[0].y) / 2, z: 0 }),
        PointToGlobal(point, { x: (lowerPlate[3].x + upperPlate[3].x) / 2, y: (lowerPlate[3].y + upperPlate[3].y) / 2, z: 0 }),
    ];

    let section = [
        diaSection.lowerWidth,
        diaSection.lowerThickness,
        diaSection.upperWidth,
        diaSection.upperThickness,
        diaSection.upperHeight - diaSection.lowerHeight,
        diaSection.webThickness,
        diaSection.stiffThickness,
        diaSection.stiffWidth,
    ];

    let topLeftDimPoints = [
        uflangeModel["model"]["topView"][0],
        webPlateModel["model"]["topView"][0],
        webPlateModel["model"]["topView"][1],
        uflangeModel["model"]["topView"][1],
    ];

    let topRightDimPoints = [
        uflangeModel["model"]["topView"][3],
        webPlateModel["model"]["topView"][3],
        webPlateModel["model"]["topView"][2],
        uflangeModel["model"]["topView"][2],
    ];
    let bottomLeftDimPoints = [
        lflangeModel["model"]["bottomView"][0],
        webPlateModel["model"]["bottomView"][0],
        webPlateModel["model"]["bottomView"][1],
        lflangeModel["model"]["bottomView"][1],
    ];
    let bottomRightDimPoints = [
        lflangeModel["model"]["bottomView"][3],
        webPlateModel["model"]["bottomView"][3],
        webPlateModel["model"]["bottomView"][2],
        lflangeModel["model"]["bottomView"][2],
    ];

    let sectionLeftDimPoints = [upperPlate[0], upperPlate[1], lowerPlate[0], lowerPlate[1]];
    let sectionRightDimPoints = [upperPlate[2], upperPlate[3], lowerPlate[2], lowerPlate[3]];

    let sd = SectionDimension(sectionPoint);
    diaSection["totalHeight"] = diaHeight;
    let sectionID = sectionPoint.input.wuf.toFixed(0)
                    +sectionPoint.input.wlf.toFixed(0)
                    +sectionPoint.input.tlf.toFixed(0)
                    +sectionPoint.input.tuf.toFixed(0)
                    +sectionPoint.input.tw.toFixed(0);
    let parent = {
        part: gridkey,
        id:
            sectionID + 
            diaSectionName +
            bl.x.toFixed(0) +
            bl.y.toFixed(0) +
            tl.x.toFixed(0) +
            tl.y.toFixed(0) +
            br.x.toFixed(0) +
            br.y.toFixed(0) +
            tr.x.toFixed(0) +
            tr.y.toFixed(0),
        sectionName: diaSectionName,
        point: point,
        inode: gridkey + "L",
        jnode: gridkey + "R",
        key: gridkey + "X",
        isKframe: false,
        data: data,
        section: section,
        diaSection,
        properties: {},
        model: {
            sectionView: sectionPointToSectionView(sectionPoint),
        },
        dimension: {
            sectionView: [
                {
                    type: "DIMALIGN",
                    points: [sd.top[0], sd.top[sd.top.length - 1]],
                    index: sd.topIndex ? 0 : 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 2,
                },
                {
                    type: "DIMALIGN",
                    points: sd.top,
                    index: sd.topIndex ? 0 : sd.top.length - 1,
                    isHorizontal: true,
                    isTopOrRight: true,
                    offsetIndex: 1,
                },
                {
                    type: "DIMALIGN",
                    points: [sd.bottom[0], sd.bottom[sd.bottom.length - 1]],
                    index: 0,
                    isHorizontal: true,
                    isTopOrRight: false,
                    offsetIndex: 2,
                },
                { type: "DIMALIGN", points: sd.bottom, index: 0, isHorizontal: true, isTopOrRight: false, offsetIndex: 1 },
                { type: "DIMALIGN", points: sd.left, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 4 },
                {
                    type: "DIMALIGN",
                    points: [...sd.left, ...sectionLeftDimPoints],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 3,
                },
                { type: "DIMALIGN", points: sd.right, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 4 },
                {
                    type: "DIMALIGN",
                    points: [...sd.right, ...sectionRightDimPoints],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 3,
                },
            ],
            topView: [
                {
                    type: "DIMALIGN",
                    points: [topLeftDimPoints[0], topLeftDimPoints[topLeftDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                {
                    type: "DIMALIGN",
                    points: [topRightDimPoints[0], topRightDimPoints[topRightDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: topRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
            bottomView: [
                {
                    type: "DIMALIGN",
                    points: [bottomLeftDimPoints[0], bottomLeftDimPoints[bottomLeftDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: false,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: bottomLeftDimPoints, index: 0, isHorizontal: false, isTopOrRight: false, offsetIndex: 3 },
                {
                    type: "DIMALIGN",
                    points: [bottomRightDimPoints[0], bottomRightDimPoints[bottomRightDimPoints.length - 1]],
                    index: 0,
                    isHorizontal: false,
                    isTopOrRight: true,
                    offsetIndex: 4,
                },
                { type: "DIMALIGN", points: bottomRightDimPoints, index: 0, isHorizontal: false, isTopOrRight: true, offsetIndex: 3 },
            ],
        },
    };
    result["parent"].push(parent);
    return result;
}