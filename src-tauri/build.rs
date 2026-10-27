fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        println!("cargo:rerun-if-env-changed=DEVELOPER_DIR");
        println!("cargo:rerun-if-env-changed=SDKROOT");
        let gate = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../scripts/macos_sdk_gate.mjs");
        println!("cargo:rerun-if-changed={}", gate.display());
        let status = std::process::Command::new("node").arg(gate).status().expect("Node required for SDK gate");
        assert!(status.success(), "macOS SDK27.0 baseline gate failed");
    }

    tauri_build::build();
}
