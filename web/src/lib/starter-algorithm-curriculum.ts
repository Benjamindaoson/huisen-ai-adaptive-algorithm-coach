import type { FoundationLesson } from './foundation-curriculum';

export const STARTER_ALGORITHM_LESSONS: FoundationLesson[] = [
  {
    id: 'starter-array-traversal', order: 1, chapter: '掌握常用算法', title: '从头到尾看懂一组数据', plainTitle: '数组遍历', professionalName: '数组遍历与边界',
    objective: '你会知道“逐个处理一组数据”时，循环每一轮到底拿到了什么。', minutes: 8, language: 'python', prerequisites: [], skillIds: ['array'],
    analogy: '把一篮水果逐个放到桌上：每次只拿一个，处理完再拿下一个，直到篮子空了。',
    explanation: '数组是一排有顺序的数据。遍历不是一次看完所有数据，而是让程序按顺序把每一个元素交到你手里。',
    frames: [
      { title: '先准备一排数据', code: 'scores = [72, 88, 91]', state: [{ name: 'scores', value: '[72, 88, 91]', changed: true }], note: '这里有三项数据，程序会按从左到右的顺序处理。' },
      { title: '第一轮拿到一个值', code: 'for score in scores:', state: [{ name: 'score', value: '72', changed: true }], note: '第一轮，score 代表第一个元素 72。' },
      { title: '每轮只做一件事', code: '    print(score)', state: [{ name: '输出', value: '72，再到 88、91', changed: true }], note: '循环会重复同一件事，直到每个元素都被处理。' },
    ],
    checkpoint: { question: 'scores = [4, 7, 9]，第一次循环时 score 是什么？', options: ['4', '7', '9'], answerIndex: 0, explanation: '遍历从第一个元素开始，所以第一轮拿到 4。', misconception: '循环不是随机抽取；它会按数组原有顺序逐个处理。' },
    completion: { prompt: '补全代码，让程序逐个打印数组中的数字。', template: 'for number in [2, 5, 8]:\n    print(___)', answer: 'number', explanation: '每一轮的当前元素就保存在 number 里。' },
    transfer: { title: '在真实题中逐个检查', prompt: '下一道题会让你逐个检查一组数据；先说出“循环变量”代表什么，再开始写代码。', skillId: 'array' },
  },
  {
    id: 'starter-hash-lookup', order: 2, chapter: '掌握常用算法', title: '用记录本快速找到答案', plainTitle: '哈希查找', professionalName: '集合与快速查找',
    objective: '你会知道什么时候不用反复扫描，而是先把已经见过的数据记下来。', minutes: 8, language: 'python', prerequisites: ['starter-array-traversal'], skillIds: ['hash'],
    analogy: '通讯录把姓名直接对应到号码；找人时不必从第一页开始逐个翻。',
    explanation: 'set 像“已经见过”的清单。每次先问它：这个值来过吗？再把当前值记进去，就能避免反复扫描。',
    frames: [
      { title: '准备空记录本', code: 'seen = set()', state: [{ name: 'seen', value: '{}', changed: true }], note: '一开始还没有记录任何数据。' },
      { title: '先问，再记录', code: 'if number in seen:', state: [{ name: 'number', value: '3' }, { name: 'seen', value: '{1, 3}', changed: true }], note: '这一步是在问：3 是否已经出现过。' },
      { title: '保存当前数据', code: 'seen.add(number)', state: [{ name: 'seen', value: '{1, 3, 5}', changed: true }], note: '处理完后把当前值记下，给后面的轮次使用。' },
    ],
    checkpoint: { question: '如果任务只是判断“某个数字是否出现过”，最合适的记录工具是什么？', options: ['set', '双层循环', '字符串拼接'], answerIndex: 0, explanation: 'set 专门表达“是否存在”，查找也很直接。', misconception: '不是所有问题都要反复遍历；先记录能让后续判断更简单。' },
    completion: { prompt: '补全代码，把当前数字记到 seen 中。', template: 'seen = set()\nseen.___ (number)', answer: 'add', explanation: 'add 会把一个元素加入集合。' },
    transfer: { title: '在真实题中快速判断重复', prompt: '下一道题会需要判断重复或配对；先写下集合里要保存什么。', skillId: 'hash' },
  },
  {
    id: 'starter-two-pointers', order: 3, chapter: '掌握常用算法', title: '从两边一起缩小范围', plainTitle: '双指针', professionalName: '双指针',
    objective: '你会用左右两个位置逐步排除不可能的答案，而不是把所有组合都试一遍。', minutes: 8, language: 'python', prerequisites: ['starter-hash-lookup'], skillIds: ['array'],
    analogy: '两个人从书架两端向中间找书：总和太小，左边的人往右；总和太大，右边的人往左。',
    explanation: '在有序数组里，left 和 right 分别指向两端。根据当前结果移动其中一个指针，每次都能排除一批不可能的组合。',
    frames: [
      { title: '站在两端', code: 'left, right = 0, len(nums) - 1', state: [{ name: 'left', value: '0', changed: true }, { name: 'right', value: '4', changed: true }], note: '两个指针先覆盖最大范围。' },
      { title: '比较当前组合', code: 'current = nums[left] + nums[right]', state: [{ name: 'current', value: '11', changed: true }], note: '先看两端组合离目标有多远。' },
      { title: '只移动需要移动的一端', code: 'left += 1', state: [{ name: 'left', value: '1', changed: true }], note: '当总和偏小时，左指针右移，尝试更大的值。' },
    ],
    checkpoint: { question: '有序数组中，两端之和比目标小，下一步通常怎么做？', options: ['left 向右移动', 'right 向左移动', '两个都不动'], answerIndex: 0, explanation: '要得到更大的和，需要让左侧值变大。', misconception: '移动指针不是猜测；方向来自“当前和与目标”的比较。' },
    completion: { prompt: '补全代码：当和太小时，让左指针向右移动。', template: 'if current < target:\n    left ___ 1', answer: '+=', explanation: 'left += 1 会把左指针向右推进一格。' },
    transfer: { title: '在真实题中缩小搜索范围', prompt: '下一道题会让你用两个位置靠近答案；先写出每一种比较结果该移动哪一边。', skillId: 'array' },
  },
];
