import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tobotak',
    category: 'maker',
    description: 'AI Image: tobotak',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tobotak', ctx.prefix); }
};