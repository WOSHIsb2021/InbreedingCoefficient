# 动物育种近交系数计算模块 - 原理与版本说明

本项目提供了一个用于计算动物近交系数（Inbreeding Coefficient, F）的 JavaScript 模块。它基于遗传学的“Wright 路径系数法”，能够根据用户提供的扁平化谱系数据，构建血缘关系网络，并计算任意个体配对后其假想后代的近交系数。

为了满足在**准确性**、**性能**和**计算灵活性**方面的不同需求，项目提供了三个核心实现版本。

## 版本一：经典路径法 (Classic Method)

对应文件 `breedingCalculator.js`

此版本是“Wright 路径系数法”最经典、最直接的**高中**教科书式实现。

方法原理：[近交系数的计算](https://mp.weixin.qq.com/s/sBNsRjnCEnb5AlSdyKfQAA)

### 实现原理

1. **谱系构建与缓存**: 与其他版本类似，它首先将谱系数据构建成一个相互连接的 `Animal` 对象网络。它也使用全局缓存来存储已计算过的结果以提升性能。

2. **共同祖先识别**: 找出父母双方的所有共同祖先。

3. **核心逻辑 - 路径独立性检查**: 这是此版本的关键。对于每一个共同祖先，算法会：
   a. 找出从父亲到该祖先的所有路径。
   b. 找出从母亲到该祖先的所有路径。
   c. 对每一对“父路径”和“母路径”进行**独立性检查** (`_arePathsIndependent`)，确保两条路径除了共同祖先这个终点外，没有共享任何中间节点。
   d. **只有当路径对被确认为独立时**，才会计算其贡献。贡献值使用简化公式 `(0.5)^(n+m+1)`，其中 `n` 和 `m` 分别是两条路径的长度。

4. **结果累加**: 将所有通过独立性检查的路径对的贡献值相加，得到最终的近交系数。

   方法原理：[Horse Genetics 4.0: Evolution, Breeds, Breeding Strategies and Inbreeding | Laboratoire de génétique vétérinaire](https://labgenvet.ca/en/horse-genetics-4-0-evolution-breeds-breeding-strategies-and-inbreeding/)

### 侧重

- **理论一致性**: 严格遵循经典遗传学教科书中的计算规则。
- **局限性**: 当共同祖先本身也是近交的产物时，这种严格的独立性检查会“剪掉”一些有效的遗传路径，导致**计算结果偏低**，无法准确处理复杂的谱系。

## 版本二：高性能缓存版 (Cached Method)

对应文件 `breedingCalculator2.js`
此版本在算法上进行了升级，以精确计算复杂谱系，并为极致性能进行了优化。

### 实现原理

1.  **共享实例与全局缓存**: 为了最大化性能，整个计算过程共享一个 `BreedingPlanner` 和一个 `RelatednessCalculator` 实例。计算器内部包含三级缓存：个体近交系数 (`inbreedingCache`)、配对后代近交系数 (`offspringInbreedingCache`) 和寻路路径 (`pathCache`)。
2.  **核心逻辑 - 全路径累加与祖先校正**: 此版本移除了路径独立性检查，转而采用功能上等价于更高级“表格法”的逻辑：
    a. 对于每一个共同祖先 A，找出所有从父母到它的路径。
    b. 对**所有可能的路径对**（不再进行独立性检查），使用 Wright 的**完整公式** `(0.5)^(n+m+1) * (1 + Fa)` 来计算贡献。
    c. `Fa` 是共同祖先 A **自身的近交系数**。这个值通过**递归调用** `calculateInbreeding(A)` 获得。
3.  **递归信任**: 算法信任 `(1 + Fa)` 这个校正因子能够自动、精确地处理所有复杂的、重叠的遗传路径带来的影响。

### 侧重

- **准确性与极致性能**: 算法能精确处理复杂谱系。全局缓存机制使得在处理静态、大型谱系时速度极快。
- **局限性**: 共享实例和全局缓存的设计，使其在处理动态变化的谱系数据时（例如，同一个体 ID 在一次运行中拥有不同祖先），会因**缓存污染**而产生错误结果。

## 版本三：独立计算版 (Isolated Method) - **推荐**

对应文件 `breedingCalculator3.js`

此版本在 V2 的高精度算法基础上，解决了其灵活性和数据安全性的短板，是功能最健壮的版本。

### 实现原理

1.  **独立实例与无缓存**: 这是此版本的核心设计。
    a. 主函数 `calculateBreedingInbreeding` 在其循环中，**为每一对需要计算的父母，都创建一个全新的、隔离的 `BreedingPlanner` 和 `RelatednessCalculator` 实例**。
    b. 计算器内部**不包含任何性能缓存**。每一次计算（无论是获取 `Fa` 还是寻找路径）都是从头开始的实时计算。
2.  **核心算法**: 算法逻辑与 V2 完全相同，即采用“全路径累加与祖先校正”的方法，递归计算 `Fa` 并应用完整公式 `(0.5)^(n+m+1) * (1 + Fa)`。
3.  **数据隔离**: 由于每次计算都在一个“沙盒”环境中进行，任何一次配对的谱系数据和计算过程都完全不会影响到下一次计算，从根本上杜绝了数据串扰的可能。

### 侧重

- **最高的准确性与灵活性**: 继承了 V2 的高精度算法，同时通过独立实例和无缓存设计，完美支持对动态谱系的“what-if”分析。
- **健壮性**: 结果绝对可靠，不受先前计算状态的影响。
- **性能权衡**: 牺牲了批量计算时的性能，以换取最高的灵活性和数据安全性。

---

## 核心差异简述

| 特性                  | 版本一 (Classic) | 版本二 (Cached)       | 版本三 (Isolated) - **推荐** |
| :-------------------- | :--------------- | :-------------------- | :--------------------------- |
| **算法逻辑**          | 路径独立性检查   | 全路径累加 `(1 + Fa)` | 全路径累加 `(1 + Fa)`        |
| **缓存策略**          | 有 (全局缓存)    | 有 (全局缓存)         | **无**                       |
| **实例管理**          | 共享实例         | 共享实例              | **独立实例**                 |
| **准确性 (复杂谱系)** | **不足**         | **高**                | **高**                       |
| **灵活性 (动态谱系)** | **低**           | **低 (结果会出错)**   | **高 (结果正确)**            |
| **性能**              | 中等             | **最高**              | 中等                         |

## 如何使用

可以参考 test.js(版本一的测试样例，其余依此类推)

测试结果：

![image-20250612222122503](C:\Users\wine\AppData\Roaming\Typora\typora-user-images\image-20250612222122503.png)

以下：为网站计算[Inbreeding Calculator | Laboratoire de génétique vétérinaire](https://labgenvet.ca/en/inbreeding-calculator/)结果，可知结果一致

![屏幕截图 2025-06-12 195210](F:\Pictures\Screenshots\屏幕截图 2025-06-12 195210.png)



![屏幕截图 2025-06-12 195259](F:\Pictures\Screenshots\屏幕截图 2025-06-12 195210.png)

母牛谱系数据：

- 是一个单独的对象 (Object)

- 包含该母牛自身 ID 和所有已知祖先的 ID

- 示例中的 cowData 是一个包含完整谱系信息的对象

- 关键字段示例：

```javascript
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
}
```

公牛谱系数据：

- 是一个对象数组 (Array of Objects)

- 每个对象代表一头公牛及其谱系信息

- 示例中的 bullDataArray 是包含一个公牛记录的数组

结构示例：

```javascript
[
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
  // 可以添加更多公牛记录...
]
```



**每次计算都是"一对多"的关系（1 头母牛 × 多头公牛）**

**空值可以用 null、undefined 或空字符串 "" 表示**

注：此文档由AI生成，可能会有纰漏