import { THREE } from "global";
import {
    DimAng,
    GetArcPoints2D,
    GetBoundaryForDrawings,
    Hatch,
    IsPointInPolygon,
    Line,
    PointToDraw,
    RotateTransModels,
    Text,
    ToDimAlign,
} from "@nexivil/package-modules";

export function GenPartPlanDraw(part, isTop) {
    let result = [];
    let value = isTop ? "topView" : "bottomView";
    if (part["type"] === "shapeExtrude") {
        if (part["model"][value]) {
            result.push(ToLine(part["model"][value], "GREEN", true));
        }
    } else if (part["type"] === "bolt" && part["model"]) {
        if (part["model"][value]) {
            result.push(...part["model"][value]);
        }
    }
    return result;
}

export function GenPartSideDraw(part) {
    let result = [];
    if (part["type"] === "shapeExtrude") {
        if (part["model"]["sideView"]) {
            result.push(ToLine(part["model"]["sideView"], "GREEN", true));
        }
    } else if (part["type"] === "bolt" && part["model"]) {
        if (part["model"]["sideView"]) {
            result.push(...part["model"]["sideView"]);
        }
    }
    return result;
}

export function GenWeldingDetailDraw(weldingInput, fontSize, mark, xOffset, yOffset) {
    let result = [];
    // let mark = "A";
    let sc = fontSize / 2; // sc의 경우 도면스케일 상의 1:2 도면을 기준으로 함
    let wObj = GetWeldingInfo(weldingInput);
    // let maxT = Math.max(weldingInput.thickness1, weldingInput.thickness2);
    let d1 = Math.tan(((wObj.angle1 / 2) * Math.PI) / 180) * wObj.depth1 * sc;

    if (wObj.type === "V") {
        let leftPlate = [
            { x: xOffset - 40 * sc, y: yOffset },
            { x: xOffset - 1 * sc, y: yOffset },
            { x: xOffset - 1 * sc, y: yOffset + wObj.root * sc },
            { x: xOffset - 1 * sc - d1, y: yOffset + (wObj.root + wObj.depth1) * sc },
        ];
        if (weldingInput.thickness1 > weldingInput.thickness2) {
            leftPlate.push({
                x: xOffset - 1 * sc - d1 - 2.5 * (weldingInput.thickness1 - weldingInput.thickness2) * sc,
                y: yOffset + weldingInput.thickness1 * sc,
            });
        }
        leftPlate.push({ x: xOffset - 40 * sc, y: yOffset + weldingInput.thickness1 * sc });
        leftPlate.push(
            ...GetArcPoints2D(
                {
                    x: xOffset - 40 * sc - ((Math.cos(Math.PI / 6) * weldingInput.thickness1) / 2) * sc,
                    y: yOffset + (weldingInput.thickness1 * sc * 3) / 4,
                },
                (weldingInput.thickness1 / 2) * sc,
                Math.PI / 6,
                -Math.PI / 6,
                true
            ),
            ...GetArcPoints2D(
                {
                    x: xOffset - 40 * sc + ((Math.cos(Math.PI / 6) * weldingInput.thickness1) / 2) * sc,
                    y: yOffset + (weldingInput.thickness1 * sc) / 4,
                },
                (weldingInput.thickness1 / 2) * sc,
                Math.PI - Math.PI / 6,
                Math.PI + Math.PI / 6,
                false
            )
        );

        let rightPlate = [
            { x: xOffset + 40 * sc, y: yOffset },
            { x: xOffset + 1 * sc, y: yOffset },
            { x: xOffset + 1 * sc, y: yOffset + wObj.root * sc },
            { x: xOffset + 1 * sc + d1, y: yOffset + (wObj.root + wObj.depth1) * sc },
        ];
        if (weldingInput.thickness2 > weldingInput.thickness1) {
            rightPlate.push({
                x: xOffset + 1 * sc + d1 + 2.5 * (weldingInput.thickness2 - weldingInput.thickness1) * sc,
                y: yOffset + weldingInput.thickness2 * sc,
            });
        }
        rightPlate.push({ x: xOffset + 40 * sc, y: yOffset + weldingInput.thickness2 * sc });
        rightPlate.push(
            ...GetArcPoints2D(
                {
                    x: xOffset + 40 * sc - ((Math.cos(Math.PI / 6) * weldingInput.thickness2) / 2) * sc,
                    y: yOffset + (weldingInput.thickness2 * sc * 3) / 4,
                },
                (weldingInput.thickness2 / 2) * sc,
                Math.PI / 6,
                -Math.PI / 6,
                true
            ),
            ...GetArcPoints2D(
                {
                    x: xOffset + 40 * sc + ((Math.cos(Math.PI / 6) * weldingInput.thickness2) / 2) * sc,
                    y: yOffset + (weldingInput.thickness2 * sc) / 4,
                },
                (weldingInput.thickness2 / 2) * sc,
                Math.PI - Math.PI / 6,
                Math.PI + Math.PI / 6,
                false
            )
        );

        let theta = Math.atan2((wObj.root + wObj.depth1 * 2) * sc, 1 * sc + d1);
        let radius = Math.sqrt(((wObj.root + wObj.depth1 * 2) * sc) ** 2 + (1 * sc + d1) ** 2);
        let arcPts = GetArcPoints2D({ x: xOffset, y: yOffset - wObj.depth1 * sc }, radius, theta, Math.PI - theta, false);
        let arc1 = new Line(arcPts, "CYAN", false, null);
        // let arc1 = ToArcLine({ x: xOffset, y: yOffset - wObj.depth1 * sc }, radius, theta, Math.PI - theta, false, "CYAN");
        result.push(arc1);
        let pt = [rightPlate[1], rightPlate[2], ...arc1.vertices, leftPlate[2], leftPlate[1]];
        result.push(new Hatch(pt, "RED"));
        result.push(new Line(leftPlate, "CYAN", false, null));
        result.push(new Line(rightPlate, "CYAN", false, null));

        if (weldingInput.thickness2 > weldingInput.thickness1) {
            result.push(ToDimAlign([leftPlate[0], leftPlate[4]], fontSize, "DIM", false, false, 0, 0, 0));
            result.push(ToDimAlign([rightPlate[0], rightPlate[3], rightPlate[4]], fontSize, "DIM", false, true, 0, 0, 0));
            result.push(ToDimAlign([rightPlate[0], rightPlate[4]], fontSize, "DIM", false, true, 0, 0, 1));
        } else {
            result.push(ToDimAlign([leftPlate[0], leftPlate[4]], fontSize, "DIM", false, false, 0, 0, 1));
            result.push(ToDimAlign([leftPlate[0], leftPlate[3], leftPlate[4]], fontSize, "DIM", false, false, 0, 0, 0));
            result.push(ToDimAlign([rightPlate[0], rightPlate[4]], fontSize, "DIM", false, true, 0, 0, 0));
        }
        result.push(ToDimAlign([leftPlate[3], rightPlate[3]], fontSize, "DIM", true, true, 0, 1, 0));
        result.push(ToDimAlign([leftPlate[1], rightPlate[1]], fontSize, "DIM", true, false, 0, 0, 0));

        let anchor = {};
        let rot = 0;
        if (weldingInput.thickness2 > weldingInput.thickness1) {
            anchor = { x: (rightPlate[3].x + rightPlate[4].x) / 2, y: (rightPlate[3].y + rightPlate[4].y) / 2 - fontSize * 0.75 };
            rot = Math.atan2(rightPlate[4].y - rightPlate[3].y, rightPlate[4].x - rightPlate[3].x);
            result.push(new Text(anchor, "1:2.5", fontSize, rot, "center", "CZ-TEX0"));
        } else if (weldingInput.thickness2 < weldingInput.thickness1) {
            anchor = { x: (leftPlate[4].x + leftPlate[3].x) / 2, y: (leftPlate[4].y + leftPlate[3].y) / 2 - fontSize * 0.75 };
            rot = Math.atan2(leftPlate[3].y - leftPlate[4].y, leftPlate[3].x - leftPlate[4].x);
            result.push(new Text(anchor, "1:2.5", fontSize, rot, "center", "CZ-TEX0"));
        }
        // result.push(ToDimAng([leftPlate[2], leftPlate[3]], [rightPlate[2], rightPlate[3]], "DIM", fontSize, true, 0));
        result.push(new DimAng([leftPlate[2], leftPlate[3]], [rightPlate[2], rightPlate[3]], fontSize, "DIM", true, true));

        if (weldingInput.type === "B") {
            let titleanchor = { x: (leftPlate[1].x + rightPlate[1].x) / 2, y: (leftPlate[1].y + rightPlate[1].y) / 2 + 40 * sc };
            result.push(new Text(titleanchor, '"' + mark + '"용접[' + wObj.type + "맞대기]", fontSize * 4, 0, "center", "CZ-TEX0"));
            result.push(new Text({ x: titleanchor.x + fontSize * 10, y: titleanchor.y - fontSize * 4 }, "S=1:2", fontSize * 2, 0, "left", "CZ-TEX0"));
        }
    } else if (wObj.type === "X") {
        let d2 = Math.tan(((wObj.angle2 / 2) * Math.PI) / 180) * wObj.depth2 * sc;
        let leftPlate = [
            { x: xOffset - 40 * sc, y: yOffset },
            { x: xOffset - 1 * sc - d2, y: yOffset },
            { x: xOffset - 1 * sc, y: yOffset + wObj.depth2 * sc },
            { x: xOffset - 1 * sc, y: yOffset + (wObj.root + wObj.depth2) * sc },
            { x: xOffset - 1 * sc - d1, y: yOffset + (wObj.depth2 + wObj.root + wObj.depth1) * sc },
        ];
        if (weldingInput.thickness1 > weldingInput.thickness2) {
            leftPlate.push({
                x: xOffset - 1 * sc - d1 - 2.5 * (weldingInput.thickness1 - weldingInput.thickness2) * sc,
                y: yOffset + weldingInput.thickness1 * sc,
            });
        }
        leftPlate.push({ x: xOffset - 40 * sc, y: yOffset + weldingInput.thickness1 * sc });
        leftPlate.push(
            ...GetArcPoints2D(
                {
                    x: xOffset - 40 * sc - ((Math.cos(Math.PI / 6) * weldingInput.thickness1) / 2) * sc,
                    y: yOffset + (weldingInput.thickness1 * sc * 3) / 4,
                },
                (weldingInput.thickness1 / 2) * sc,
                Math.PI / 6,
                -Math.PI / 6,
                true
            ),
            ...GetArcPoints2D(
                {
                    x: xOffset - 40 * sc + ((Math.cos(Math.PI / 6) * weldingInput.thickness1) / 2) * sc,
                    y: yOffset + (weldingInput.thickness1 * sc) / 4,
                },
                (weldingInput.thickness1 / 2) * sc,
                Math.PI - Math.PI / 6,
                Math.PI + Math.PI / 6,
                false
            )
        );

        let rightPlate = [
            { x: xOffset + 40 * sc, y: yOffset },
            { x: xOffset + 1 * sc + d2, y: yOffset },
            { x: xOffset + 1 * sc, y: yOffset + wObj.depth2 * sc },
            { x: xOffset + 1 * sc, y: yOffset + (wObj.root + wObj.depth2) * sc },
            { x: xOffset + 1 * sc + d1, y: yOffset + (wObj.depth2 + wObj.root + wObj.depth1) * sc },
        ];
        if (weldingInput.thickness2 > weldingInput.thickness1) {
            rightPlate.push({
                x: xOffset + 1 * sc + d1 + 2.5 * (weldingInput.thickness2 - weldingInput.thickness1) * sc,
                y: yOffset + weldingInput.thickness2 * sc,
            });
        }
        rightPlate.push({ x: xOffset + 40 * sc, y: yOffset + weldingInput.thickness2 * sc });
        rightPlate.push(
            ...GetArcPoints2D(
                {
                    x: xOffset + 40 * sc - ((Math.cos(Math.PI / 6) * weldingInput.thickness2) / 2) * sc,
                    y: yOffset + (weldingInput.thickness2 * sc * 3) / 4,
                },
                (weldingInput.thickness2 / 2) * sc,
                Math.PI / 6,
                -Math.PI / 6,
                true
            ),
            ...GetArcPoints2D(
                {
                    x: xOffset + 40 * sc + ((Math.cos(Math.PI / 6) * weldingInput.thickness2) / 2) * sc,
                    y: yOffset + (weldingInput.thickness2 * sc) / 4,
                },
                (weldingInput.thickness2 / 2) * sc,
                Math.PI - Math.PI / 6,
                Math.PI + Math.PI / 6,
                false
            )
        );

        let theta = Math.atan2((wObj.root + wObj.depth1 * 2) * sc, 1 * sc + d1);
        let radius = Math.sqrt(((wObj.root + wObj.depth1 * 2) * sc) ** 2 + (1 * sc + d1) ** 2);
        let arcPts1 = GetArcPoints2D({ x: xOffset, y: yOffset + wObj.depth2 * sc - wObj.depth1 * sc }, radius, theta, Math.PI - theta, false);
        let arc1 = new Line(arcPts1, "CYAN", false, null);
        // let arc1 = ToArcLine({ x: xOffset, y: yOffset + wObj.depth2 * sc - wObj.depth1 * sc }, radius, theta, Math.PI - theta, false, "CYAN");
        result.push(arc1);

        let theta2 = Math.atan2((wObj.root + wObj.depth2 * 2) * sc, 1 * sc + d2);
        let radius2 = Math.sqrt(((wObj.root + wObj.depth2 * 2) * sc) ** 2 + (1 * sc + d2) ** 2);
        let arcPts2 = GetArcPoints2D({ x: xOffset, y: yOffset + (wObj.depth2 * 2 + wObj.root) * sc }, radius2, Math.PI + theta2, -theta2, false);
        let arc2 = new Line(arcPts2, "CYAN", false, null);
        // let arc2 = ToArcLine({ x: xOffset, y: yOffset + (wObj.depth2 * 2 + wObj.root) * sc }, radius2, Math.PI + theta2, -theta2, false, "CYAN");
        result.push(arc2);

        let pt = [...arc2.vertices, rightPlate[1], rightPlate[2], rightPlate[3], ...arc1.vertices, leftPlate[3], leftPlate[2], leftPlate[1]];
        result.push(new Hatch(pt, "RED"));
        result.push(new Line(leftPlate, "CYAN", false, null));
        result.push(new Line(rightPlate, "CYAN", false, null));
        if (weldingInput.thickness2 > weldingInput.thickness1) {
            result.push(ToDimAlign([leftPlate[0], leftPlate[5]], fontSize, "DIM", false, false, 0, 0, 0));
            result.push(
                ToDimAlign([rightPlate[0], rightPlate[2], rightPlate[3], rightPlate[4], rightPlate[5]], fontSize, "DIM", false, true, 0, 0, 0)
            );
            result.push(ToDimAlign([rightPlate[0], rightPlate[5]], fontSize, "DIM", false, true, 0, 0, 1));
        } else {
            result.push(ToDimAlign([leftPlate[0], leftPlate[5]], fontSize, "DIM", false, false, 0, 0, 1));
            result.push(ToDimAlign([leftPlate[0], leftPlate[2], leftPlate[3], leftPlate[4], leftPlate[5]], fontSize, "DIM", false, false, 0, 0, 0));
            result.push(ToDimAlign([rightPlate[0], rightPlate[5]], fontSize, "DIM", false, true, 0, 0, 0));
        }
        result.push(ToDimAlign([leftPlate[4], rightPlate[4]], fontSize, "DIM", true, true, 0, 1, 0));
        result.push(ToDimAlign([leftPlate[1], leftPlate[2], rightPlate[2], rightPlate[1]], fontSize, "DIM", true, false, 0, 0, 0));

        let anchor = {};
        let rot = 0;
        if (weldingInput.thickness2 > weldingInput.thickness1) {
            anchor = { x: (rightPlate[4].x + rightPlate[5].x) / 2, y: (rightPlate[4].y + rightPlate[5].y) / 2 - fontSize * 0.75 };
            rot = Math.atan2(rightPlate[5].y - rightPlate[4].y, rightPlate[5].x - rightPlate[4].x);
            result.push(new Text(anchor, "1:2.5", fontSize, rot, "center", "CZ-TEX0"));
        } else if (weldingInput.thickness2 < weldingInput.thickness1) {
            anchor = { x: (leftPlate[5].x + leftPlate[4].x) / 2, y: (leftPlate[5].y + leftPlate[4].y) / 2 - fontSize * 0.75 };
            rot = Math.atan2(leftPlate[4].y - leftPlate[5].y, leftPlate[4].x - leftPlate[5].x);
            result.push(new Text(anchor, "1:2.5", fontSize, rot, "center", "CZ-TEX0"));
        }
        result.push(new DimAng([leftPlate[3], leftPlate[4]], [rightPlate[3], rightPlate[4]], fontSize, "DIM", true, true));
        result.push(new DimAng([rightPlate[2], rightPlate[1]], [leftPlate[2], leftPlate[1]], fontSize, "DIM", false, true));
        if (weldingInput.type === "B") {
            let titleanchor = { x: (leftPlate[1].x + rightPlate[1].x) / 2, y: (leftPlate[1].y + rightPlate[1].y) / 2 + 40 * sc };
            result.push(new Text(titleanchor, '"' + mark + '"용접[' + wObj.type + "맞대기]", fontSize * 4, 0, "center", "CZ-TEX0"));
            result.push(new Text({ x: titleanchor.x + fontSize * 10, y: titleanchor.y - fontSize * 4 }, "S=1:2", fontSize * 2, 0, "left", "CZ-TEX0"));
        }
    }
    return result;
}

// WeldingDataGen
export function GetWeldingInfo(weldingInput) {
    let type = "";
    let depth1 = 0;
    let depth2 = 0;
    let root = 0;
    let angle1 = 0;
    let angle2 = 0;
    let t = [weldingInput.thickness1, weldingInput.thickness2];
    if (weldingInput.type === "B") {
        let minT = Math.min(...t);
        angle1 = 60;
        angle2 = 60;
        if (minT < 18) {
            root = 2;
            type = "V";
            depth1 = minT - root;
        } else {
            type = "X";
            root = 2;
            depth2 = Math.round(minT / 3);
            depth1 = minT - depth2 - root;
        }
    } else if (weldingInput.type === "F" || weldingInput.type === "FF") {
        type = weldingInput.type;
        let maxT = Math.max(...t);
        if (maxT < 6) {
            depth1 = 3;
        } else if (maxT < 12) {
            depth1 = 5;
        } else if (maxT < 20) {
            depth1 = 6;
        } else {
            depth1 = 8;
        }
    }
    return {
        type,
        depth1,
        depth2,
        root,
        angle1,
        angle2,
        //Line: weldingInput.line
    };
}

export function DrawGirderMiniMap(girderStation, steelBoxDict, girderIndex1, girderIndex2, xOffset, yOffset, scale, fontSize, boundary) {
    let result = [];
    let girderNum = girderStation.length;

    const l2 = [girderStation[0][0].point, girderStation[0][girderStation[0].length - 1].point];
    let top = []; //GirderPlanDrawV2(steelBoxDict["children"], ["TopPlate"], 4, 0, 1)
    for (let i in steelBoxDict["children"]) {
        if (steelBoxDict["children"][i]["meta"]["key"].includes("TopPlate")) {
            top.push(...steelBoxDict["children"][i]["model"]["topView"]);
        }
    }
    let meta = {}; // TODO: input으로 받거나 일괄성 확인 후 작성 필요
    let rot = -1 * Math.atan2(l2[1].y - l2[0].y, l2[1].x - l2[0].x);
    let initPoint = l2[0];
    top.push(new Hatch(GetGirderBoundaryPoints(steelBoxDict["children"], girderIndex1, girderIndex2, boundary), "RED2", meta));
    let initTemp = top.map(draw => RotateTransModels(draw, initPoint, 0, 0, rot, scale));
    let { xMin, xMax, yMin, yMax } = GetBoundaryForDrawings(initTemp, fontSize * 4, fontSize * 4, fontSize * 8, fontSize * 5);
    let temp = initTemp.map(draw => RotateTransModels(draw, { x: xMin, y: yMax }, xOffset, yOffset, 0, 1));
    result.push(...temp);

    let layout = [];
    let supportCount = 1;
    girderStation[girderNum - 1].forEach(value => {
        if (value.key.includes("S") && !value.key.includes("SP")) {
            let position = PointToDraw(value.point, scale, initPoint, rot, 0, -2000, xOffset - xMin, yOffset - yMax);
            result.push(
                new Text({ x: position.x, y: position.y - fontSize * 1.5 }, "P" + supportCount.toString(), fontSize / 2, 0, "center", "CZ-TEX0")
            );
            position.rotate = 0;
            layout.push(position);
            supportCount += 1;
        }
    });

    let spCount = 1;
    girderStation[0].forEach(value => {
        if (value.key.includes("SP")) {
            let position = PointToDraw(value.point, scale, l2[0], rot, 0, 2000, xOffset - xMin, fontSize + yOffset - yMax);
            result.push(new Text(position, "SP" + spCount.toString(), fontSize / 2, 0, "center", "CZ-TEX0"));
            result.push(new Line(GetRoundedRect(position.x, position.y, 0, fontSize * 2, fontSize * 1, fontSize / 2), "RED", true, null));
            spCount += 1;
        }
    });

    let pt = [
        { x: 0, y: 0 },
        { x: -fontSize / 2, y: -fontSize },
        { x: fontSize / 2, y: -fontSize },
    ];
    for (let i in layout) {
        result.push(new Hatch(PointToDraw(pt, 1, { x: 0, y: 0 }, 0, 0, 0, layout[i].x, layout[i].y), "YELLOW")); //ToBlock(pt, layout, "YELLOW"));
    }

    result.push(
        new Line(
            [
                { x: xOffset, y: yOffset },
                { x: xMax - xMin + xOffset, y: yOffset },
                { x: xMax - xMin + xOffset, y: yMin - yMax + yOffset },
                { x: xOffset, y: yMin - yMax + yOffset },
            ],
            "RED",
            true,
            null
        )
    );
    result.push(new Text({ x: (xMax - xMin) / 2 + xOffset, y: -fontSize * 3 + yOffset }, "요약도", fontSize, 0, "center", "CZ-TEX0"));
    return result;
}

export function GetRoundedRect(x, y, rot, width, height, radius) {
    //, lineMaterial) { //마크 테두리
    let shape = new THREE.Shape();
    shape.moveTo(-width / 2, -height / 2 + radius);
    shape.lineTo(-width / 2, height / 2 - radius);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2 + radius, height / 2);
    shape.lineTo(width / 2 - radius, height / 2);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2, height / 2 - radius);
    shape.lineTo(width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2 - radius, -height / 2);
    shape.lineTo(-width / 2 + radius, -height / 2);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2, -height / 2 + radius);
    let result = [];
    let cos = Math.cos(rot);
    let sin = Math.sin(rot);
    let points = shape.getPoints(8);
    points.forEach(pt => result.push({ x: pt.x * cos - pt.y * sin + x, y: pt.x * sin + pt.y * cos + y }));
    return result; //new THREE.Line(geometry, lineMaterial)
}

function GetGirderBoundaryPoints(steelBoxChildren, leftGirderIndex, rightGirderIndex, boundary) {
    let result = [];
    const sectionPointNum = 4;
    const leftKey = "G" + leftGirderIndex.toString() + "TopPlate";
    const rightKey = "G" + rightGirderIndex.toString() + "TopPlate";

    for (let k of [0, 1]) {
        let line = [];
        let name = k === 0 ? leftKey : rightKey;
        for (let part in steelBoxChildren) {
            if (steelBoxChildren[part]["meta"]["key"].includes(name)) {
                let ptsL1 = [];
                let ptsC1 = [];
                for (let j = 0; j < steelBoxChildren[part]["points"].length; j++) {
                    let index = k === 1 && j === 2 ? 1 : 0;
                    let pts1 = [];
                    // let pts2 = [];
                    for (let i = 0; i < steelBoxChildren[part]["points"][j].length; i += sectionPointNum) {
                        pts1.push(steelBoxChildren[part]["points"][j][i + index]);
                    }
                    if (k === 0 && j == 0) {
                        ptsL1.push(...pts1);
                    }
                    if (k === 1 && j == 1) {
                        ptsL1.push(...pts1);
                    }
                    if (j == 2) {
                        ptsC1.push(...pts1);
                    }
                }
                if (ptsC1.length === 0) {
                    line.push(...ptsL1);
                } else if (ptsC1.length > 0 && ptsL1.length > 0) {
                    if (ptsC1[0].x === ptsL1[ptsL1.length - 1].x && ptsC1[0].y === ptsL1[ptsL1.length - 1].y) {
                        line.push(...ptsL1, ...ptsC1);
                    } else {
                        line.push(...ptsC1, ...ptsL1);
                    }
                } else if (ptsL1.length === 0 && ptsL1.length === 0) {
                    line.push(...ptsC1);
                }
            }
        }
        if (k === 0) {
            for (let l = 0; l < line.length; l++) {
                if (IsPointInPolygon(line[l], boundary, true)) {
                    // if (line[l].x * a1 - line[l].y + b1 > -0.1 && line[l].x * a2 - line[l].y + b2 < 0.1) {
                    result.push(line[l]);
                }
            }
        } else {
            for (let l = line.length - 1; l > -1; l--) {
                if (IsPointInPolygon(line[l], boundary, true)) {
                    // if (line[l].x * a1 - line[l].y + b1 > -0.1 && line[l].x * a2 - line[l].y + b2 < 0.1) {
                    result.push(line[l]);
                }
            }
        }
    }
    return result;
}
