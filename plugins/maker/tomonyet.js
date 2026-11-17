import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tomonyet',
    category: 'maker',
    description: 'AI Image: tomonyet',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tomonyet', ctx.prefix); }
};