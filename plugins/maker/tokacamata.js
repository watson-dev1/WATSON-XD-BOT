import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tokacamata',
    category: 'maker',
    description: 'AI Image: tokacamata',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tokacamata', ctx.prefix); }
};