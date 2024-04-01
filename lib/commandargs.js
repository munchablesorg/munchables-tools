import commandLineArgs from "command-line-args";

const cmd_options_def = [
  { name: "start-block", alias: "s", type: Number },
  { name: "end-block", alias: "e", type: Number },
  { name: "populate", alias: "p", type: Boolean },
  { name: "address", alias: "a", type: String }
];
const options = commandLineArgs(cmd_options_def);

export const get_catchup_block = () => {
  let catchup_from_block = 0;
  if (options["start-block"]) {
    catchup_from_block = options["start-block"];
  }
  return catchup_from_block;
};

export const get_end_block = () => {
  let end_block = 0;
  if (options["end-block"]) {
    end_block = options["end-block"];
  }
  return end_block;
};

export const get_populate = () => {
  if (process.env.POPULATE) {
    return true;
  }
  else if (options["populate"]) {
    return options["populate"];
  }
  return false;
};


export const get_address = () => {
  if (options["address"]) {
    return options["address"];
  }
  return '';
};
