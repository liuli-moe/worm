import { glob, path, fs } from 'zx'
import { format } from 'prettier'

const replaces: [string | RegExp, string][] = [
  // 替换单引号为双引号
  [/"(.*?)"/g, '“$1”'],
  [/'(.*?)'/g, '‘$1’'],
  ['"‘', '“‘'],
  ['’"', '’”'],
  // 替换斜体为粗体
  [/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '**$1**'],
  [/_([^\x00-\xff]+?)_/g, '**$1**'],
  // 替换 - 为中文的 ——
  [/([\u4e00-\u9fa5]+?)-([\u4e00-\u9fa5”]+?)/g, '$1—$2'],
  [/([\u4e00-\u9fa5\*]+?)-([\u4e00-\u9fa5”\*]+?)/g, '$1—$2'],
  [/([\u4e00-\u9fa5\*]+?) ?- ?([\u4e00-\u9fa5”\*]+?)/g, '$1—$2'],
  [/([\u4e00-\u9fa5？]+?)--([\u4e00-\u9fa5”]+?)/g, '$1——$2'],
  [/([\u4e00-\u9fa5？]+?) --([\u4e00-\u9fa5”]+?)/g, '$1——$2'],
  ['-”', '—”'],
  [/([\u4e00-\u9fa5]+?)-$/gm, '$1—'],
  [/^-([\u4e00-\u9fa5]+?)/gm, '—$1'],
  [/^- ?([\u4e00-\u9fa5]+?) ?-$/gm, '—$1—'],
  // 替换英文 , 为中文的，
  [',', '，'],
  [/([\u4e00-\u9fa5]+?)!/g, '$1！'],
  [/([\u4e00-\u9fa5]+?);/g, '$1；'],
  [/([\u4e00-\u9fa5]+?)\?/g, '$1？'],
  [/([\u4e00-\u9fa5]+?):( ?)/g, '$1：'],
  [/([\u4e00-\u9fa5]+?)·([\u4e00-\u9fa5]+?)/g, '$1・$2'],
  [/「(.*?)」/g, '“$1”'],
  // 替换中文的数字为阿拉伯数字，例如 １．１ 为 1.1
  ['１', '1'],
  ['２', '2'],
  ['３', '3'],
  ['４', '4'],
  ['５', '5'],
  ['６', '6'],
  ['７', '7'],
  ['８', '8'],
  ['９', '9'],
  ['０', '0'],
  ['．', '.'],
  [/^.*简体中文.*$/mg, ''],
  // 替换人名
  ['亚历山大', '亚历山德拉'],
  ['军械大师', '武器大师'],
  ['兵器大师', '武器大师'],
  ['军械长', '武器大师'],
  ['女民兵', '民兵小姐'],
  ['民兵女士', '民兵小姐'],
  ['万灵', '万能药'],
  ['潘娜希娅', '万能药'],
  ['帕娜希雅', '万能药'],
  ['万愈', '万能药'],
  ['万能医者', '万能药'],
  ['万能医师', '万能药'],
  ['万能治愈师', '万能药'],
  ['荣光女郎', '荣耀女孩'],
  ['荣光女孩', '荣耀女孩'],
  ['力量人', '电力人'],
  ['麦迪森·克莱门斯', '麦迪森・克莱门茨'],
  ['假面', '披风'],
  ['鬼李', '李鬼'],
  ['格鲁', '暗魇'],
  ['时停者', '吊挡钟'],
  ['时钟阻击者', '吊挡钟'],
  ['时钟阻滞者', '吊挡钟'],
  ['时钟阻断者', '吊挡钟'],
  ['时钟阻滞', '吊挡钟'],
  ['维斯塔', '远景'],
  ['埃吉斯', '神盾'],
  ['艾吉斯', '神盾'],
  ['少年胜利', '胜利小子'],
  ['恫岩', '恫巖'],
  ['守护者', '保护者'],
  ['守望者', '保护者'],
  ['警卫', '监护者'],
  ['监管者', '监护者'],
  ['地下帮派', '暗影帮'],
  ['地下帮', '暗影帮'],
  ['地下团伙', '暗影帮'],
  ['地下党', '暗影帮'],
  ['战栗', '暗魇'],
  ['战慄', '暗魇'],
  ['古鲁', '暗魇'],
  ['塔特尔泰尔', '谜探'],
  ['密探', '谜探'],
  ['神谕', '谜探'],
  ['泰特尔', '谜探'],
  ['谜探者', '谜探'],
  ['告密者', '谜探'],
  ['密告者', '谜探'],
  ['密谋者', '谜探'],
  ['蕾切尔・林特', '瑞秋・林德'],
  ['摄政者', '摄政王'],
  [/摄政(?!王)/g, '摄政王'],
  ['超能力者', '超人类'],
  ['超能者', '超人类'],
  ['爆炸女', '爆弹'],
  ['格拉德利', '盖德利'],
  ['格莱德利', '盖德利'],
  ['史巴奇', '斯帕基'],
  ['斯帕奇', '斯帕基'],
  ['披风服装', '戏服'],
  ['机匠', '修补匠'],
  ['机械师', '修补匠'],
  ['艾利克', '亚历克'],
  ['艾力克', '亚历克'],
  ['亚力克', '亚历克'],
  ['艾雷克', '亚历克'],
  ['艾里克', '亚历克'],
  ['阿列克', '亚历克'],
  ['阿莱克', '亚历克'],
  ['阿雷克', '亚历克'],
  ['莉萨', '丽莎'],
  ['莉莎', '丽莎'],
  ['丽萨', '丽莎'],
  ['蕾切尔', '瑞秋'],
  ['暗影追踪者', '暗影潜行者'],
  ['安妮特・罗丝・赫伯特', '安妮特・萝丝・赫伯特'],
  ['・道尔顿', '・达隆'],
  ['考伊尔', '蛇蜷'],
  ['优伯', '至尊'],
  ['优步', '至尊'],
  ['利特', '黑客'],
  ['布拉克顿湾', '布罗克顿'],
  ['布莱克顿湾', '布罗克顿'],
  ['布洛克顿', '布罗克顿'],
  ['木板步道', '海滨大道'],
  ['终结召唤者', '终结者'],
  ['末日使者', '终结者'],
]

for (const it of await glob('./books/**/*.md')) {
  console.log(it)
  const fsPath = path.resolve(it)
  const r = replaces.reduce(
    (acc, [reg, rep]) => acc.replaceAll(reg, rep),
    await fs.readFile(fsPath, 'utf-8'),
  )
  await fs.writeFile(fsPath, await format(r, { parser: 'markdown' }))
}
