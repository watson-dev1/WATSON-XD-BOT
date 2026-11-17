import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'toviking',
    category: 'maker',
    description: 'AI Image: toviking',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'toviking', ctx.prefix); }
};