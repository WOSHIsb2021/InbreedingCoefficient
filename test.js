// test.js

// 1. 引入模块
const { calculateBreedingInbreeding } = require('./breedingCalculator.js');

// 2. 定义母牛谱系数据
const cowData =
{
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "id": 5,
    "sBirth": null,
    "fId": "B1",
    "mId": "B2",
    "ffId": "P1",
    "fmId": "P2",
    "mfId": "P1",
    "mmId": "P2",
    "fffId": "",
    "ffmId": "M",
    "fmfId": "",
    "fmmId": "M",
    "mffId": "",
    "mfmId": "M",
    "mmfId": "",
    "mmmId": "M",
    "deptId": null,
    "deptName": null,
    "sid": "C2"
};

// 公牛数据是一个数组，包含所有待配对的公牛及其相关亲属的记录
const bullDataArray = [
    {
        "createBy": null,
        "createTime": null,
        "updateBy": null,
        "updateTime": null,
        "remark": null,
        "id": 1,
        "sId": "C1",
        "sBirth": null,
        "fId": "B1",
        "mId": "",
        "ffId": "P1",
        "fmId": "P2",
        "mfId": "",
        "mmId": "",
        "fffId": "",
        "ffmId": "M",
        "fmfId": "",
        "fmmId": "",
        "mffId": "",
        "mfmId": "",
        "mmfId": "",
        "mmmId": ""
    },
];


// 3. 调用函数并传入数据
const results = calculateBreedingInbreeding(cowData, bullDataArray);

// 4. 打印结果
console.log("--- 育种配对计算结果 ---");
if (results && results.length > 0) {
    results.forEach(result => {
        // console.log(
        //     `公牛 (Bull) ID: ${result.bullId}, 母牛 (Cow) ID: ${result.cowId} -> 后代近交系数: ${result.inbreedingCoefficient}`
        // );
        console.log(result);
    });
} else {
    console.log("没有生成任何配对结果。");
}