use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use neon::prelude::*;

#[derive(Hash)]
struct MatchingResult {
    id: u32,
}


fn hash_matching_result(mut cx: FunctionContext) -> JsResult<JsString> {
    let mut s = DefaultHasher::new();
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
