use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use neon::prelude::*;

// TODO: Add real matching result struct
#[derive(Hash)]
struct MatchingResult {
    id: u32,
}


fn hash_matching_result(mut cx: FunctionContext) -> JsResult<JsString> {
    // TODO: Replace DefaultHasher with merkle tree construction
    let mut s = DefaultHasher::new();

    // TODO: Replace stub matching result with parsing JS object from arguments
    let matching_result = MatchingResult {
        id: 5,
    };

    matching_result.hash(&mut s);

    Ok(cx.string(s.finish().to_string()))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("hashMatchingResult", hash_matching_result)?;
    Ok(())
}
