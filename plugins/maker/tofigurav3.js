import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tofigurav3',
    category: 'maker',
    description: 'AI Image: tofigurav3',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tofigurav3', ctx.prefix); }
};