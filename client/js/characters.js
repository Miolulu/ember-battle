const CHARACTERS = {
  yan: { id: 'yan', name: '焰', role: '突击', teamRole: '输出', speed: 3.5, maxHp: 100, damage: 25, skillName: '焚烧', skillCooldown: 8000, color: '#ff4d35' },
  shenmu: { id: 'shenmu', name: '沈暮', role: '干扰', teamRole: '控制', speed: 4.5, maxHp: 70, damage: 18, skillName: '入侵', skillCooldown: 8000, color: '#4da6ff' },
  sutang: { id: 'sutang', name: '苏棠', role: '辅助', teamRole: '治疗', speed: 3.5, maxHp: 100, damage: 12, skillName: '愈合', skillCooldown: 8000, color: '#4dff88' },
  luyu: { id: 'luyu', name: '陆屿', role: '防御', teamRole: '坦克', speed: 2.8, maxHp: 140, damage: 18, skillName: '铁壁', skillCooldown: 8000, color: '#b0b8c4' },
  jiangxue: { id: 'jiangxue', name: '姜雪', role: '狙击', teamRole: '输出', speed: 3.5, maxHp: 70, damage: 30, skillName: '相位射击', skillCooldown: 8000, color: '#c8d8ff' },
  peijin: { id: 'peijin', name: '裴今', role: '概率', teamRole: '辅助', speed: 4.5, maxHp: 70, damage: 10, skillName: '干涉', skillCooldown: 8000, color: '#ffd700' },
};
const CHAR_LIST = ['yan', 'shenmu', 'sutang', 'luyu', 'jiangxue', 'peijin'];

const TEAM_COLORS = ['#ff4d35', '#4da6ff', '#ffd700'];
const TEAM_NAMES = ['红队', '蓝队', '金队'];

module.exports = { CHARACTERS, CHAR_LIST, TEAM_COLORS, TEAM_NAMES };
