// test3.js

// 1. 引入模块
const { calculateBreedingInbreeding } = require('./breedingCalculator3.js');

// 2. 定义母牛谱系数据
const cowData =
{
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "id": 1,
    "sBirth": null,
    "fId": "2",
    "mId": "3",
    "ffId": "4",
    "fmId": "5",
    "mfId": "6",
    "mmId": "7",
    "fffId": "8",
    "ffmId": "9",
    "fmfId": "10",
    "fmmId": "11",
    "mffId": "12",
    "mfmId": "13",
    "mmfId": "14",
    "mmmId": "15",
    "deptId": null,
    "deptName": null,
    "sid": "1"
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
        "sId": "50",
        "sBirth": null,
        "fId": "2",
        "mId": "3",
        "ffId": "4",
        "fmId": "5",
        "mfId": "6",
        "mmId": "7",
        "fffId": "8",
        "ffmId": "9",
        "fmfId": "10",
        "fmmId": "11",
        "mffId": "12",
        "mfmId": "13",
        "mmfId": "14",
        "mmmId": "15"
    },
    {
        "createBy": null,
        "createTime": null,
        "updateBy": null,
        "updateTime": null,
        "remark": null,
        "id": 2,
        "sId": "51",
        "sBirth": null,
        "fId": "17",
        "mId": "18",
        "ffId": "19",
        "fmId": "20",
        "mfId": "21",
        "mmId": "22",
        "fffId": "8",
        "ffmId": "9",
        "fmfId": "10",
        "fmmId": "11",
        "mffId": "12",
        "mfmId": "13",
        "mmfId": "14",
        "mmmId": "15"
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