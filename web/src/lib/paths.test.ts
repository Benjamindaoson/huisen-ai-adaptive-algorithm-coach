import { expect, it } from 'vitest';
import { LEARNING_PATHS, resolvePath } from './paths';

it('only includes indexed IDs and preserves path order', () => {
  const catalog = [
    { id: 'od-ipv4', title: 'IPv4 地址转换成整数', searchText: '' },
    { id: 'od-tlv', title: 'TLV 编码', searchText: '' },
    { id: 'od-other', title: '其他题', searchText: '' },
  ];

  expect(resolvePath(LEARNING_PATHS[0], catalog)).toEqual(['od-ipv4', 'od-tlv']);
});
