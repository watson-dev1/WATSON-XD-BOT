import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'toroblox',
    category: 'maker',
    description: 'AI Image: toroblox',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'toroblox', ctx.prefix); }
};