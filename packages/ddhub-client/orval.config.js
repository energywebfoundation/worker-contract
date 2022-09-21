module.exports = {
  api: {
    input: `./schema.json`,
    output: {
      mode: 'tags',
      target: './src/client',
      override: {
        mutator: './src/response-type.ts',
      },
      clean: true,
    },
  },
};
