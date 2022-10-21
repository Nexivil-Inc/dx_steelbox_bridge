import { GenVPlate_rev, GetPlateRestPoint, scallop, ToGlobalPoint2 } from "./utils";
export function GenJackupModelFn(gridPointDict, sectionPointDict, jackupInfo) {
    let model = { parent: [], children: [] };
    for (let i in jackupInfo) {
        let gridkey = jackupInfo[i][0];
        let webPoints = sectionPointDict[gridkey].forward.web;
        let stPoint = gridPointDict[gridkey];
        let data = jackupInfo[i];
        let sectionNum = i;

        let layout = [];
        let l1 = data[1].split(",");
        l1.forEach(elem => layout.push(elem.trim() * 1));
        let length = data[2] * 1 ?? 0;
        let height = data[3] * 1 ?? 0;
        let thickness = data[4] * 1 ?? 0;
        let chamfer = data[5] * 1 ?? 0;
        //  임시 입력변수

        const bl = webPoints[0][0];
        const bl2 = webPoints[0][3];
        const tl = webPoints[0][1];
        const br = webPoints[1][0];
        const br2 = webPoints[1][3];

        const tr = webPoints[1][1];
        const lwCot = (tl.x - bl.x) / (tl.y - bl.y);
        const rwCot = (tr.x - br.x) / (tr.y - br.y);
        // const gradient = (tr.y - tl.y) / (tr.x - tl.x)

        let upperPoints = [
            { x: bl.x + lwCot * length, y: bl.y + length },
            { x: br.x + rwCot * length, y: br.y + length },
            { x: bl2.x + lwCot * length, y: bl2.y + length },
            { x: br2.x + rwCot * length, y: br2.y + length },
        ];
        let left = GetPlateRestPoint(bl, upperPoints[0], 0, 0, height);
        let leftPoints = [];
        leftPoints.push(left[0]);
        leftPoints.push(left[1]);
        leftPoints.push(...scallop(left[1], left[2], left[3], chamfer, 1));
        leftPoints.push(left[3]);
        let right = GetPlateRestPoint(br, upperPoints[1], 0, 0, -height);
        let rightPoints = [];
        rightPoints.push(right[0]);
        rightPoints.push(right[1]);
        rightPoints.push(...scallop(right[1], right[2], right[3], chamfer, 1));
        rightPoints.push(right[3]);
        let left1 = GetPlateRestPoint(bl2, upperPoints[2], 0, 0, -height);
        let leftPoints2 = [];
        leftPoints2.push(left1[0]);
        leftPoints2.push(left1[1]);
        leftPoints2.push(...scallop(left1[1], left1[2], left1[3], chamfer, 1));
        leftPoints2.push(left1[3]);
        let right1 = GetPlateRestPoint(br2, upperPoints[3], 0, 0, height);
        let rightPoints2 = [];
        rightPoints2.push(right1[0]);
        rightPoints2.push(right1[1]);
        rightPoints2.push(...scallop(right1[1], right1[2], right1[3], chamfer, 1));
        rightPoints2.push(right1[3]);
        let partKey = gridkey + "J" + sectionNum;
        for (let i in layout) {
            let newPoint = ToGlobalPoint2(stPoint, { x: 0, y: layout[i] });
            let leftJackModel = GenVPlate_rev(leftPoints, newPoint, thickness, [], 15, null, null);
            leftJackModel.meta = { ...leftJackModel.meta, part: partKey, key: "left-inner", girder: stPoint.girderNum };
            let rightJackupModel = GenVPlate_rev(rightPoints, newPoint, thickness, [], 15, null, null);
            rightJackupModel.meta = { ...rightJackupModel.meta, part: partKey, key: "right-inner", girder: stPoint.girderNum };
            model["children"].push(leftJackModel, rightJackupModel);

            // result["children"].push(
            //     {
            //         ...leftJackModel,
            //         meta: { part: partKey, key: "left1" + i, girder: stPoint.girderNum, seg: stPoint.segNum },
            //         properties: {},
            //         weld: [
            //             {
            //                 type: "FF",
            //                 thickness1: thickness,
            //                 thickness2: thickness,
            //                 line: [[left[0], left[1]]],
            //                 sideView: {
            //                     point: WeldingPoint([leftJackModel["model"].sideView[0], leftJackModel["model"].sideView[1]], 0.5),
            //                     isUpper: true,
            //                     isRight: true,
            //                     isXReverse: false,
            //                     isYReverse: false,
            //                 },
            //             },
            //         ],
            //         textLabel: {},
            //         dimension: {},
            //     },
            //     {
            //         ...vPlateGenV2(rightPoints, newPoint, thickness, [], 15, null, null, [], null, null, [0, 4]),
            //         meta: { part: partKey, key: "right1" + i, girder: stPoint.girderNum, seg: stPoint.segNum },
            //         properties: {},
            //         weld: [
            //             {
            //                 type: "FF",
            //                 thickness1: thickness,
            //                 thickness2: thickness,
            //                 line: [[right[0], right[1]]],
            //             },
            //         ],
            //         textLabel: {},
            //         dimension: {},
            //     }
            // );

            let isOutterJackup = data[6];
            if (isOutterJackup) {
                let leftJackModel2 = GenVPlate_rev(leftPoints2, newPoint, thickness, [], 15, null, null);
                leftJackModel2.meta = { ...leftJackModel2.meta, part: partKey, key: "left-outter", girder: stPoint.girderNum };
                let rightJackupModel2 = GenVPlate_rev(rightPoints2, newPoint, thickness, [], 15, null, null);
                rightJackupModel2.meta = { ...rightJackupModel2.meta, part: partKey, key: "right-outter", girder: stPoint.girderNum };
                model["children"].push(leftJackModel2, rightJackupModel2);
                // result["children"].push(
                //     {
                //         ...vPlateGenV2(leftPoints2, newPoint, thickness, [], 15, null, null, [], null, null, [0, 4]),
                //         meta: { part: partKey, key: "left2" + i, girder: stPoint.girderNum, seg: stPoint.segNum },
                //         properties: {},
                //         weld: [
                //             {
                //                 type: "FF",
                //                 thickness1: thickness,
                //                 thickness2: thickness,
                //                 line: [[left1[0], left1[1]]],
                //             },
                //         ],
                //         textLabel: {},
                //         dimension: {},
                //     },
                //     {
                //         ...vPlateGenV2(rightPoints2, newPoint, thickness, [], 15, null, null, [], null, null, [0, 4]),
                //         meta: { part: partKey, key: "right2" + i, girder: stPoint.girderNum, seg: stPoint.segNum },
                //         properties: {},
                //         weld: [
                //             {
                //                 type: "FF",
                //                 thickness1: thickness,
                //                 thickness2: thickness,
                //                 line: [[right1[0], right1[1]]],
                //             },
                //         ],
                //         textLabel: {},
                //         dimension: {},
                //     }
                // );
            }
        }
    }
    return { model };
}
