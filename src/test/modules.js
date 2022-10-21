import { Leader, Line, Text } from "@nexivil/package-modules";

export function compareTestFn(input1, input2) {
    let pts = [
        { x: 0, y: 0, z: 0 },
        { x: 15000, y: 10000, z: 0 },
    ];
    let testLeader = new Leader(pts, "test1", "test2", 40, "RED");
    let testText1 = new Text({ x: 10000, y: 10000, z: 10000 }, "left", 100, 0, "left", "RED");
    let testText2 = new Text({ x: 10000, y: 10100, z: 10000 }, "center", 100, 0, "center", "RED");
    let testText3 = new Text({ x: 10000, y: 10200, z: 10000 }, "right", 100, 0, "right", "RED");

    let testLine1 = new Line(pts, "RED", false, 500);
    // return [testText1, testText2, testText3];
    return [testLine1];

    // let isErr = false;
    // const jsonString1 = Buffer.from(input1).toString("utf8");
    // const parsedData1 = JSON.parse(jsonString1);
    // const jsonString2 = Buffer.from(input2).toString("utf8");
    // const parsedData2 = JSON.parse(jsonString2);

    // for (let g in parsedData1) {
    //     let g1 = parsedData1[g];
    //     let g2 = parsedData2[g];
    //     for (let f in g1) {
    //         let first1 = g1[f];
    //         let first2 = g2[f];
    //         // console.log(first1)
    //         // if (Math.abs(first1.x - first2.x) > 1e-3 || Math.abs(first1.y - first2.y) > 1e-3 || Math.abs(first1.z - first2.z) > 1e-3) {
    //         //     console.log(first1, first2);
    //         // }
    //         for (let s in first1) {
    //             let second1 = first1[s];
    //             let second2 = first2[s];
    //             // if (f === "0" && s === "3") {
    //             //     console.log(Math.abs(second1.x - second2.x), Math.abs(second1.y - second2.y), Math.abs(second1.z - second2.z));
    //             // }
    //             if (Math.abs(second1.x - second2.x) > 1e-3 || Math.abs(second1.y - second2.y) > 1e-3 || Math.abs(second1.z - second2.z) > 1e-3) {
    //                 if (g === "0") console.log(g, f, s);
    //             }
    //         }
    //         // for (let s in first1) {
    //         //     let second1 = first1[s];
    //         //     let second2 = first2[s];
    //         //     for (let t in second1) {
    //         //         let third1 = second1[t];
    //         //         let third2 = second2[t];
    //         //         let axisList = ["x", "y"];
    //         //         axisList.forEach(axis => {
    //         //             if (Math.abs(third1[axis] - third2[axis]) > 1e-2) {
    //         //                 // console.log(axis, Math.abs(third1[axis] - third2[axis]))
    //         //                 // if (g==="0", third1.x===508915) console.log(axis, third1[axis],third2[axis])
    //         //                 if (g === "0") console.log("f:{0}, s:{1}, t:{2}".format(f, s, t));
    //         //                 isErr = true;
    //         //             }
    //         //         });
    //         //         if (isErr) {
    //         //             // console.log(third1.stationNumber)
    //         //             // console.log(third1, third2);
    //         //         }
    //         //         isErr = false;
    //         //     }
    //         // }
    //     }
    // }
    // return "ok";
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != "undefined" ? args[number] : match;
        });
    };
}
