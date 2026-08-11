import { OD_SKILLS, type SkillId } from './skills';

export type LessonChapter = '先会让程序工作' | '学会拆解问题' | '掌握常用算法';

export type LessonFrame = {
  title: string;
  code: string;
  state: Array<{ name: string; value: string; changed?: boolean }>;
  note: string;
};

export type FoundationLesson = {
  id: string;
  order: number;
  chapter: LessonChapter;
  title: string;
  plainTitle: string;
  professionalName: string;
  objective: string;
  minutes: number;
  language: 'python';
  prerequisites: string[];
  skillIds: SkillId[];
  analogy: string;
  explanation: string;
  frames: LessonFrame[];
  checkpoint: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
    misconception: string;
  };
  completion: { prompt: string; template: string; answer: string; explanation: string };
  transfer: { title: string; prompt: string; skillId: SkillId };
};

export const FOUNDATION_LESSONS: FoundationLesson[] = [
  {
    id: 'input-output', order: 1, chapter: '先会让程序工作', title: '让程序听懂你的话', plainTitle: '读进来，再说出去', professionalName: '输入、输出与类型转换',
    objective: '看懂一行输入怎样变成程序里的数字，并输出计算结果。', minutes: 12, language: 'python', prerequisites: [], skillIds: ['io-parsing'],
    analogy: '程序像一位严格的收银员：你递给它的是写着“12”的纸条，它必须先把文字认成数字，才能做加法。',
    explanation: 'input() 读到的永远是文字。int(...) 像拆掉数字外面的引号，print(...) 再把结果展示给人看。',
    frames: [
      { title: '先收到文字', code: "age = input()", state: [{ name: '输入', value: '18' }, { name: 'age', value: "'18'", changed: true }], note: '18 现在仍然是文字，不是可以计算的数字。' },
      { title: '再变成数字', code: 'age = int(age)', state: [{ name: 'age', value: '18', changed: true }], note: 'int 把文字 18 转成数字 18。' },
      { title: '最后输出', code: 'print(age + 1)', state: [{ name: '输出', value: '19', changed: true }], note: '数字可以参与加法，所以得到 19。' },
    ],
    checkpoint: { question: "执行 n = input()，用户输入 7 后，n 是什么？", options: ['数字 7', "文字 '7'", '空值'], answerIndex: 1, explanation: 'input() 的结果总是文字，需要 int(n) 才会变成数字。', misconception: '你可能把“看起来像数字”和“程序里的数字类型”混在了一起。' },
    completion: { prompt: '补全代码，让输入的数字加 1 后输出。', template: "n = int(input())\nprint(n + ___)", answer: '1', explanation: 'n 已经是数字，只需加 1。' },
    transfer: { title: '真正读一组数据', prompt: '找一道输入解析题，独立识别每一行数据的类型。', skillId: 'io-parsing' },
  },
  {
    id: 'variables-state', order: 2, chapter: '先会让程序工作', title: '给信息贴标签', plainTitle: '记住正在发生什么', professionalName: '变量与程序状态',
    objective: '理解变量会随语句执行而改变，并能预测某一步的值。', minutes: 12, language: 'python', prerequisites: ['input-output'], skillIds: ['simulation'],
    analogy: '变量像贴了名字的便利贴：total 这张便利贴上原来写 0，发生一笔交易后可以擦掉改成 5。',
    explanation: '等号不是“永远相等”，而是把右边算出的结果放进左边的名字里。程序状态就是这一刻所有便利贴上的内容。',
    frames: [
      { title: '建立记录', code: 'total = 0', state: [{ name: 'total', value: '0', changed: true }], note: 'total 记住当前总数为 0。' },
      { title: '读取旧值并更新', code: 'total = total + 5', state: [{ name: 'total', value: '5', changed: true }], note: '先取旧的 0，加 5，再写回 total。' },
      { title: '再次更新', code: 'total = total - 2', state: [{ name: 'total', value: '3', changed: true }], note: '状态从 5 变成 3。' },
    ],
    checkpoint: { question: 'x = 2; x = x + 3 执行后，x 是多少？', options: ['2', '3', '5'], answerIndex: 2, explanation: '右边先用旧值 2 计算出 5，再写回 x。', misconception: '等号在代码里是一次赋值动作，不是数学方程。' },
    completion: { prompt: '把买入的 4 件商品加入总数。', template: 'total = 3\ntotal = total + ___', answer: '4', explanation: '用旧总数 3 加上新增的 4。' },
    transfer: { title: '追踪状态变化', prompt: '找一道模拟题，画出至少三个关键变量的变化表。', skillId: 'simulation' },
  },
  {
    id: 'conditions', order: 3, chapter: '先会让程序工作', title: '让程序做选择', plainTitle: '如果这样，就做那样', professionalName: '条件分支',
    objective: '把现实规则写成条件，并判断程序会进入哪条分支。', minutes: 14, language: 'python', prerequisites: ['variables-state'], skillIds: ['simulation'],
    analogy: '条件像地铁闸机：余额够就开门，不够就提示充值；一次只会走符合条件的通道。',
    explanation: 'if 后面的问题只会得到 True 或 False。True 执行缩进内的代码，False 则跳到 elif 或 else。',
    frames: [
      { title: '提出问题', code: 'score = 72', state: [{ name: 'score', value: '72', changed: true }], note: '先知道要判断的数据。' },
      { title: '检查条件', code: 'if score >= 60:', state: [{ name: 'score >= 60', value: 'True', changed: true }], note: '72 大于等于 60，条件成立。' },
      { title: '只走这一支', code: "    print('通过')", state: [{ name: '输出', value: '通过', changed: true }], note: 'else 分支不会再执行。' },
    ],
    checkpoint: { question: 'temperature = 30，if temperature > 35 是否执行？', options: ['执行', '不执行'], answerIndex: 1, explanation: '30 > 35 是 False，所以跳过 if 内的代码。', misconception: '判断要代入真实值计算，不能只凭看到 if 就认为会执行。' },
    completion: { prompt: '补全及格条件。', template: "if score ___ 60:\n    print('通过')", answer: '>=', explanation: '60 分本身也算及格，所以要使用大于等于。' },
    transfer: { title: '翻译现实规则', prompt: '找一道规则判断题，把每个“如果”圈出来再编码。', skillId: 'simulation' },
  },
  {
    id: 'loops', order: 4, chapter: '先会让程序工作', title: '把重复交给程序', plainTitle: '同一件事做很多次', professionalName: '循环与累计',
    objective: '看懂循环每一轮做什么，并正确更新累计值。', minutes: 15, language: 'python', prerequisites: ['conditions'], skillIds: ['simulation'],
    analogy: '循环像逐个清点购物篮：拿起一件、登记价格、再拿下一件，直到篮子空了。',
    explanation: 'for 会把序列中的元素一个个交给变量。循环体每执行一次叫一轮，累计器要在循环前初始化。',
    frames: [
      { title: '准备空账本', code: 'total = 0', state: [{ name: 'total', value: '0', changed: true }], note: '累计前先从 0 开始。' },
      { title: '第一轮', code: 'for price in [3, 5]:\n    total += price', state: [{ name: 'price', value: '3', changed: true }, { name: 'total', value: '3', changed: true }], note: '第一件价格 3 加入总数。' },
      { title: '第二轮', code: '# 下一轮', state: [{ name: 'price', value: '5', changed: true }, { name: 'total', value: '8', changed: true }], note: '第二件价格 5，累计得到 8。' },
    ],
    checkpoint: { question: 'total 从 0 开始，依次加 2、4、6，最后是多少？', options: ['6', '10', '12'], answerIndex: 2, explanation: '三轮后的状态依次是 2、6、12。', misconception: '不要只看最后一个元素；累计变量保留了前面每一轮的结果。' },
    completion: { prompt: '补全累计代码。', template: 'total = 0\nfor n in [1, 2, 3]:\n    total = total + ___', answer: 'n', explanation: '每轮都把当前元素 n 加入 total。' },
    transfer: { title: '亲手走三轮', prompt: '找一道遍历题，先不用运行，写出前三轮变量值。', skillId: 'simulation' },
  },
  {
    id: 'arrays-strings', order: 5, chapter: '学会拆解问题', title: '管理一排数据', plainTitle: '给数据编号', professionalName: '数组、字符串与索引',
    objective: '使用从 0 开始的索引读取数据，并识别越界。', minutes: 16, language: 'python', prerequisites: ['loops'], skillIds: ['array', 'string'],
    analogy: '数组像一排储物柜，但第一个柜子的编号是 0；有 3 个柜子时，最后一个编号是 2。',
    explanation: '索引是位置编号。len(items) 是数量，最后一个合法位置是 len(items) - 1。字符串也能像字符数组一样按位置读取。',
    frames: [
      { title: '建立一排柜子', code: "items = ['A', 'B', 'C']", state: [{ name: '索引', value: '0, 1, 2' }, { name: 'items', value: "['A','B','C']", changed: true }], note: '数量是 3，编号却到 2 为止。' },
      { title: '打开第二个柜子', code: 'items[1]', state: [{ name: '结果', value: "'B'", changed: true }], note: '人说的“第二个”对应索引 1。' },
      { title: '识别边界', code: 'items[len(items) - 1]', state: [{ name: '结果', value: "'C'", changed: true }], note: '最后位置是数量减 1。' },
    ],
    checkpoint: { question: "letters = ['x','y','z']，letters[2] 是什么？", options: ["'x'", "'y'", "'z'", '越界'], answerIndex: 2, explanation: '索引 0、1、2 分别对应 x、y、z。', misconception: '索引从 0 开始，所以索引 2 是第三个元素。' },
    completion: { prompt: '补全代码，输出最后一个元素。', template: 'items = [4, 7, 9]\nprint(items[___])', answer: '-1', explanation: 'Python 的 -1 可以直接表示最后一个位置。' },
    transfer: { title: '处理真实序列', prompt: '找一道数组题，为题目中的每个“第几个”写出对应索引。', skillId: 'array' },
  },
  {
    id: 'functions-decomposition', order: 6, chapter: '学会拆解问题', title: '把大问题切成小任务', plainTitle: '先给每一步起名字', professionalName: '函数与问题分解',
    objective: '把输入、处理、输出分开，并用函数表达一个明确任务。', minutes: 16, language: 'python', prerequisites: ['arrays-strings'], skillIds: ['simulation'],
    analogy: '函数像厨房工位：洗菜、切菜、炒菜各自只负责一件事，复杂订单就能按顺序完成。',
    explanation: '函数接收材料（参数），完成一个小任务，再 return 结果。好的函数名字说明它做什么，而不是怎么做。',
    frames: [
      { title: '定义小任务', code: 'def is_even(n):', state: [{ name: '任务', value: '判断是否为偶数', changed: true }], note: '名字先说清这一块负责什么。' },
      { title: '返回判断结果', code: '    return n % 2 == 0', state: [{ name: '输入 n', value: '6' }, { name: '返回', value: 'True', changed: true }], note: '函数把结果交回调用它的地方。' },
      { title: '组合使用', code: 'print(is_even(6))', state: [{ name: '输出', value: 'True', changed: true }], note: '主流程无需重复关心判断细节。' },
    ],
    checkpoint: { question: '函数最适合承担什么？', options: ['所有事情都塞进去', '一个名字清楚的小任务', '只负责打印'], answerIndex: 1, explanation: '每个函数聚焦一个小任务，组合后解决大问题。', misconception: '函数不只是减少代码，还在帮助人拆解问题。' },
    completion: { prompt: '补全函数，让它把结果返回给调用者。', template: 'def double(n):\n    ___ n * 2', answer: 'return', explanation: 'return 把计算结果交回函数外。' },
    transfer: { title: '先拆再写', prompt: '找一道模拟题，先写出 2—3 个小任务名字，再开始编码。', skillId: 'simulation' },
  },
  {
    id: 'complexity-intuition', order: 7, chapter: '学会拆解问题', title: '别让程序做无用功', plainTitle: '数据变多时会慢多少', professionalName: '时间复杂度直觉',
    objective: '用操作次数而不是秒数比较两种方法。', minutes: 18, language: 'python', prerequisites: ['functions-decomposition'], skillIds: ['sorting'],
    analogy: '在电话簿里找人，可以从第一页逐个翻，也可以每次从中间砍掉一半；数据越多，方法差距越明显。',
    explanation: '复杂度关心输入规模 n 增长时，核心操作增长多快。一层完整循环通常约 n 次，两层嵌套通常约 n×n 次。',
    frames: [
      { title: '一层循环', code: 'for x in items:\n    check(x)', state: [{ name: 'n=100 时检查', value: '约 100 次', changed: true }], note: '数据翻倍，工作量大约翻倍。' },
      { title: '两层循环', code: 'for a in items:\n    for b in items:\n        check(a, b)', state: [{ name: 'n=100 时检查', value: '约 10,000 次', changed: true }], note: '数据翻倍，工作量大约变成四倍。' },
      { title: '用结构减少查找', code: 'seen = set(items)', state: [{ name: '单次查找', value: '通常接近固定时间', changed: true }], note: '合适的数据结构能避免反复扫描。' },
    ],
    checkpoint: { question: 'n 从 100 变成 200，两层完整嵌套循环的工作量大约变成多少倍？', options: ['2 倍', '4 倍', '100 倍'], answerIndex: 1, explanation: 'n² 从 100² 变为 200²，约是 4 倍。', misconception: '两层循环的增长会相乘，不只是相加。' },
    completion: { prompt: '补全操作次数表达式。', template: '两层各执行 n 次，总操作约为 n * ___', answer: 'n', explanation: '每个外层元素都要配合完整的 n 次内层操作。' },
    transfer: { title: '比较两个办法', prompt: '找一道数据量较大的题，标出最频繁执行的那一行。', skillId: 'sorting' },
  },
  {
    id: 'hash-lookup', order: 8, chapter: '掌握常用算法', title: '建立快速通讯录', plainTitle: '用名字直接找到东西', professionalName: '哈希表与集合',
    objective: '用字典或集合替代重复遍历，完成计数和快速查找。', minutes: 20, language: 'python', prerequisites: ['complexity-intuition'], skillIds: ['hash'],
    analogy: '哈希表像手机通讯录：输入姓名就直接看到号码，不需要每次从第一条联系人开始翻。',
    explanation: 'dict 保存“键 → 值”，set 只保存是否出现。它们适合计数、去重、查找配对。',
    frames: [
      { title: '建立空通讯录', code: 'count = {}', state: [{ name: 'count', value: '{}', changed: true }], note: '准备记录每个数字出现几次。' },
      { title: '记录第一次', code: 'count[3] = count.get(3, 0) + 1', state: [{ name: 'count', value: '{3: 1}', changed: true }], note: '没有旧记录时从 0 开始。' },
      { title: '再次遇到 3', code: 'count[3] = count.get(3, 0) + 1', state: [{ name: 'count', value: '{3: 2}', changed: true }], note: '直接找到键 3 并把次数加 1。' },
    ],
    checkpoint: { question: '需要快速判断数字是否出现过，最直接使用什么？', options: ['set', '两层循环', '字符串拼接'], answerIndex: 0, explanation: '集合专门表达“某个值是否存在”。', misconception: '当任务只是判断存在性时，不需要保存多余信息。' },
    completion: { prompt: '补全计数代码。', template: 'count[x] = count.get(x, 0) + ___', answer: '1', explanation: '每遇到一次 x，它的计数增加 1。' },
    transfer: { title: '从重复扫描到直接查找', prompt: '找一道计数或去重题，先写出字典的键和值分别代表什么。', skillId: 'hash' },
  },
  {
    id: 'two-pointers', order: 9, chapter: '掌握常用算法', title: '两个人一起找答案', plainTitle: '从两边缩小范围', professionalName: '双指针',
    objective: '在有序数组或序列中用两个位置协同移动。', minutes: 20, language: 'python', prerequisites: ['complexity-intuition'], skillIds: ['array'],
    analogy: '两个人从书架两端相向检查：信息太大就让右边的人左移，太小就让左边的人右移。',
    explanation: '双指针不是固定模板，关键是每次移动都能排除一部分不可能答案，并保持正确的不变量。',
    frames: [
      { title: '站在两端', code: 'left, right = 0, len(nums) - 1', state: [{ name: 'left', value: '0', changed: true }, { name: 'right', value: '4', changed: true }], note: '当前范围包含所有候选。' },
      { title: '和太小', code: 'left += 1', state: [{ name: 'left', value: '1', changed: true }, { name: 'right', value: '4' }], note: '有序数组中，左端太小就向右增大。' },
      { title: '范围继续缩小', code: 'while left < right:', state: [{ name: '候选范围', value: '[left, right]', changed: true }], note: '每轮至少排除一个位置。' },
    ],
    checkpoint: { question: '有序数组两端之和小于目标时，通常先移动谁？', options: ['left 向右', 'right 向左', '两者都不动'], answerIndex: 0, explanation: '要让和增大，应移走较小的左端值。', misconception: '移动方向由“如何让当前结果接近目标”决定。' },
    completion: { prompt: '补全循环条件，保证两个指针尚未相遇。', template: 'while left ___ right:', answer: '<', explanation: 'left 小于 right 时还有两个不同位置可检查。' },
    transfer: { title: '解释每次排除了什么', prompt: '找一道有序数组题，每移动一次指针都说出被排除的候选。', skillId: 'array' },
  },
  {
    id: 'sliding-window', order: 10, chapter: '掌握常用算法', title: '移动的观察窗', plainTitle: '只维护眼前这一段', professionalName: '滑动窗口',
    objective: '维护一段连续范围，并在窗口移动时增量更新状态。', minutes: 22, language: 'python', prerequisites: ['two-pointers'], skillIds: ['array'],
    analogy: '像拿一只固定宽度相框沿长照片移动：右边收入新内容，左边移出旧内容，不必每次重新看整张照片。',
    explanation: '窗口解决“连续一段”的问题。右端负责扩张，条件不满足时左端收缩，同时维护窗口内的和、计数或种类。',
    frames: [
      { title: '窗口加入右端', code: 'window_sum += nums[right]', state: [{ name: '窗口', value: '[left ... right]', changed: true }, { name: 'window_sum', value: '+ 新值', changed: true }], note: '只更新新进入的元素。' },
      { title: '窗口过大', code: 'window_sum -= nums[left]', state: [{ name: 'window_sum', value: '- 左端旧值', changed: true }], note: '移出前先撤销左端贡献。' },
      { title: '左端前进', code: 'left += 1', state: [{ name: 'left', value: '向右一格', changed: true }], note: '窗口重新满足约束。' },
    ],
    checkpoint: { question: '窗口左端移出一个数字时，窗口和应该怎样更新？', options: ['加上它', '减去它', '清零重算'], answerIndex: 1, explanation: '该数字不再属于窗口，所以撤销它的贡献。', misconception: '滑动窗口快在“增量维护”，不必每轮从头计算。' },
    completion: { prompt: '补全左端移出时的更新。', template: 'window_sum = window_sum ___ nums[left]', answer: '-', explanation: '离开窗口的元素要从当前和中减掉。' },
    transfer: { title: '识别连续范围', prompt: '找一道“最长/最短连续子数组”题，画出窗口的左右边界。', skillId: 'array' },
  },
  {
    id: 'binary-search', order: 11, chapter: '掌握常用算法', title: '每次排除一半', plainTitle: '猜中间，比大小', professionalName: '二分查找与答案二分',
    objective: '在单调范围里检查中点，并正确更新左右边界。', minutes: 22, language: 'python', prerequisites: ['complexity-intuition'], skillIds: ['binary-search'],
    analogy: '猜 1 到 100 的数字时先猜 50；对方说大了，就只剩 1 到 49，每次都砍掉一半。',
    explanation: '二分的前提是答案随位置具有单调规律。检查 mid 后，必须能确定哪一半绝不可能包含答案。',
    frames: [
      { title: '取中间', code: 'mid = (left + right) // 2', state: [{ name: '范围', value: '[1, 100]' }, { name: 'mid', value: '50', changed: true }], note: '先检查最能平分候选的点。' },
      { title: '中点太大', code: 'right = mid - 1', state: [{ name: '范围', value: '[1, 49]', changed: true }], note: 'mid 和右边都被排除。' },
      { title: '继续折半', code: 'while left <= right:', state: [{ name: '候选数量', value: '快速减半', changed: true }], note: '直到找到或范围为空。' },
    ],
    checkpoint: { question: '升序数组中 nums[mid] 大于目标，下一步怎么做？', options: ['left = mid + 1', 'right = mid - 1', '重新从头找'], answerIndex: 1, explanation: '目标只可能在 mid 左侧。', misconception: '边界更新必须排除已经检查且不可能的 mid。' },
    completion: { prompt: '补全中点计算，使用整除。', template: 'mid = (left + right) ___ 2', answer: '//', explanation: '// 得到整数索引。' },
    transfer: { title: '先证明单调', prompt: '找一道二分题，先用一句话说明为什么能排除一半。', skillId: 'binary-search' },
  },
  {
    id: 'queue-bfs', order: 12, chapter: '掌握常用算法', title: '一圈一圈向外探索', plainTitle: '先处理最早发现的', professionalName: '队列与广度优先搜索',
    objective: '使用队列按发现顺序处理状态，理解最少步数为何成立。', minutes: 24, language: 'python', prerequisites: ['arrays-strings', 'functions-decomposition'], skillIds: ['stack-queue', 'search'],
    analogy: '往水面丢一颗石子，波纹一圈圈向外扩散；离起点一步的位置先到，两步的位置后到。',
    explanation: '队列先进先出。BFS 把下一步能到的状态放到队尾，因此第一次到达某状态时，走过的步数最少。',
    frames: [
      { title: '起点入队', code: 'queue = deque([(start, 0)])', state: [{ name: '队列', value: '[(起点, 0)]', changed: true }], note: '同时记录状态和距离。' },
      { title: '取最早发现的', code: 'node, step = queue.popleft()', state: [{ name: '当前', value: '(起点, 0)', changed: true }], note: '先进队的先处理。' },
      { title: '邻居排到队尾', code: 'queue.append((next_node, step + 1))', state: [{ name: '队尾', value: '(邻居, 1)', changed: true }], note: '下一层会在当前层之后处理。' },
    ],
    checkpoint: { question: '为什么无权图 BFS 第一次到达终点通常就是最少步数？', options: ['它会尝试所有代码', '它按距离从近到远处理', '队列会自动排序数值'], answerIndex: 1, explanation: '距离为 k 的状态全部早于距离 k+1 的状态被处理。', misconception: '最短路来自分层顺序，不是队列替你比较了数值大小。' },
    completion: { prompt: '补全队列操作，取出最早进入的元素。', template: 'node = queue.___()', answer: 'popleft', explanation: 'popleft 从队列左侧取出最早加入的元素。' },
    transfer: { title: '画出搜索层次', prompt: '找一道最少步数题，先画出起点向外的前两层状态。', skillId: 'search' },
  },
];

export function getFoundationLesson(id: string): FoundationLesson | undefined {
  return FOUNDATION_LESSONS.find((lesson) => lesson.id === id);
}

export function validateFoundationCurriculum(): string[] {
  const issues: string[] = [];
  const knownSkills = new Set(OD_SKILLS.map((skill) => skill.id));
  const orderById = new Map<string, number>();
  for (const lesson of FOUNDATION_LESSONS) {
    if (!/^[a-z0-9-]+$/.test(lesson.id) || orderById.has(lesson.id)) issues.push(`课程 ID 无效或重复：${lesson.id}`);
    orderById.set(lesson.id, lesson.order);
  }
  for (const lesson of FOUNDATION_LESSONS) {
    if (lesson.language !== 'python') issues.push(`${lesson.id} 未使用 Python`);
    if (!lesson.frames.length || !lesson.analogy.trim() || !lesson.explanation.trim()) issues.push(`${lesson.id} 教学内容不完整`);
    if (lesson.checkpoint.options.length < 2 || lesson.checkpoint.answerIndex < 0 || lesson.checkpoint.answerIndex >= lesson.checkpoint.options.length) issues.push(`${lesson.id} 预测题无效`);
    if (!lesson.completion.template.includes('___') || !lesson.completion.answer.trim()) issues.push(`${lesson.id} 补全题无效`);
    if (!knownSkills.has(lesson.transfer.skillId) || lesson.skillIds.some((skill) => !knownSkills.has(skill))) issues.push(`${lesson.id} 技能映射无效`);
    for (const prerequisite of lesson.prerequisites) {
      if (!orderById.has(prerequisite) || (orderById.get(prerequisite) ?? Infinity) >= lesson.order) issues.push(`${lesson.id} 的前置课程无效：${prerequisite}`);
    }
  }
  return issues;
}
