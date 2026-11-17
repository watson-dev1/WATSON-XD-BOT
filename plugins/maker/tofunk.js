import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tofunk',
    category: 'maker',
    description: 'AI Image: tofunk',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tofunk', ctx.prefix); }
};