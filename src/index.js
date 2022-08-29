import { LiteGraph, THREE } from "global";
import { GenBoxGirder2D } from "./drawing";
import {
    FittingGridInput,
    GenBarrierModel,
    GenBasicSections,
    GenDeckModel,
    GenDefaultETCPartData,
    GenDiaphragmModel,
    GenGridInfo,
    GenSectionPointDict,
    GenSpliceModel,
    GenSteelBoxModel,
    GenVStiffModel,
    GenXBeamModel,
} from "./model";
import { compareTest } from "./test";

export let koreanFont = null;

var gloader = new THREE.FontLoader();

export default new Promise((r, j) =>
    gloader.load("/fonts/korean.json", function (font) {
        koreanFont = font;
        console.log("loaded");
        r();
    })
);

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != "undefined" ? args[number] : match;
        });
    };
}

/* model */
// grid
LiteGraph.registerNodeType("model/GenGridInfo", GenGridInfo);
LiteGraph.registerNodeType("model/FittingGridInput", FittingGridInput);
// section
LiteGraph.registerNodeType("model/GenBasicSections", GenBasicSections);
LiteGraph.registerNodeType("model/GenSectionPointDict", GenSectionPointDict);
LiteGraph.registerNodeType("model/GenDefaultETCPartData", GenDefaultETCPartData);
// steelbox
LiteGraph.registerNodeType("model/GenSteelBoxModel", GenSteelBoxModel);
// diaphragm
LiteGraph.registerNodeType("model/GenDiaphragmModel", GenDiaphragmModel);
// vertical stiffner
LiteGraph.registerNodeType("model/GenVStiffModel", GenVStiffModel);
// xbeam
LiteGraph.registerNodeType("model/GenXBeamModel", GenXBeamModel);
// splice
LiteGraph.registerNodeType("model/GenSpliceModel", GenSpliceModel);
// deck
LiteGraph.registerNodeType("model/GenDeckModel", GenDeckModel);
LiteGraph.registerNodeType("model/GenBarrierModel", GenBarrierModel);

/* drawing */
// girder
LiteGraph.registerNodeType("model/GenBoxGirder2D", GenBoxGirder2D);

/* test */
LiteGraph.registerNodeType("model/compareTest", compareTest);
