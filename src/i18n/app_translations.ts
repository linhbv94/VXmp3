export type Language = 'vi' | 'en';

export const translations = {
  vi: {
    // WindowBar & Menus
    app_title: 'VXmp3',
    menu_file: 'Tệp',
    menu_edit: 'Chỉnh sửa',
    menu_view: 'Xem',
    menu_tools: 'Công cụ',
    menu_help: 'Trợ giúp',
    open_folder: 'Mở thư mục...',
    save_tags: 'Lưu thay đổi thẻ (Cmd/Ctrl+S)',
    settings: 'Cài đặt...',
    close_window: 'Đóng cửa sổ',
    select_all: 'Chọn tất cả (Cmd/Ctrl+A)',
    deselect_all: 'Bỏ chọn tất cả (Esc)',
    view_all: 'Chế độ Đầy đủ',
    view_tags: 'Chế độ Thẻ nhạc',
    view_mp3gain: 'Chế độ MP3Gain',
    tool_analyze_disabled: 'Đo dB (Tạm tắt - chờ engine thật)',
    tool_gain_disabled: '1-Click Cân bằng (Tạm tắt - chờ engine thật)',
    tool_undo_disabled: 'Hoàn tác (Chưa hỗ trợ)',
    about: 'Giới thiệu VXmp3',

    // Settings Modal
    settings_title: 'Cài đặt',
    tab_general: 'Chung',
    tab_gain: 'Âm lượng & Gain',
    tab_shortcuts: 'Phím tắt',
    tab_updates: 'Cập nhật',
    tab_about: 'Giới thiệu',
    tab_support: 'Ủng hộ tác giả',

    // General Tab
    sec_theme: 'Chủ đề giao diện',
    theme_system: 'Theo hệ thống',
    theme_dark: 'Tối (Slate Navy)',
    theme_light: 'Sáng',
    theme_black: 'Đen tuyền (OLED)',
    sec_language: 'Ngôn ngữ giao diện',
    lang_vi: 'Tiếng Việt',
    lang_en: 'English',
    lang_scope_note: 'Lưu ý: Ngôn ngữ áp dụng cho thanh tiêu đề và hộp thoại Cài đặt; tên các trường siêu dữ liệu âm thanh giữ nguyên chuẩn kỹ thuật ID3.',

    // Loudness & Gain Tab
    sec_target_db: 'Mức chuẩn hóa âm lượng mục tiêu',
    target_db_desc: 'Quy định mức độ lớn âm thanh mà thuật toán đưa các bài hát về:',
    target_89_label: '89.0 dB SPL (Khuyến nghị ReplayGain)',
    target_89_desc: 'Mức tham chiếu ReplayGain; chức năng đo và cân bằng âm lượng chưa hỗ trợ.',
    target_96_label: '96.0 dB SPL (Âm lượng lớn)',
    target_96_desc: 'Phù hợp cho loa ngoài xe hơi hoặc máy nghe nhạc môi trường ồn ào.',
    sec_clipping: 'Bảo vệ vỡ tiếng (Clipping Protection)',
    clipping_checkbox: 'Cho phép ép tăng âm lượng bất chấp cảnh báo True Peak vượt quá 0.0 dBTP',
    clipping_disabled_note: '(Chưa hỗ trợ trong core engine hiện tại)',
    sec_autosave: 'Tự động ghi đĩa khi sửa',
    autosave_checkbox: 'Tự động ghi đĩa ngay khi rời ô Inline Edit',
    autosave_disabled_note: '(Chưa hỗ trợ - Tắt để tránh nghẽn I/O khi gõ phím nhanh; dùng Cmd/Ctrl+S để lưu chủ động)',

    // Shortcuts Tab
    sec_shortcuts_title: 'Bảng phím tắt bàn phím',
    sc_play_pause: 'Phát / Tạm dừng bài hát',
    sc_save_pending: 'Lưu tất cả thay đổi thẻ đang chờ',
    sc_select_all: 'Chọn tất cả bài hát trong danh sách',
    sc_inline_edit: 'Kích hoạt sửa nhanh ô (Inline Edit)',
    sc_nav_vertical: 'Chấp nhận & nhảy ô hàng dưới / trên',
    sc_nav_horizontal: 'Chấp nhận & nhảy ô cột phải / trái',
    sc_cancel_edit: 'Hủy sửa ô / Bỏ chọn',

    // Updates Tab
    updates_title: 'Cập nhật phần mềm',
    updates_desc: 'Kiểm tra phiên bản mới nhất và tải bản cập nhật từ GitHub Releases.',
    updates_unsupported_notice: 'Hệ thống tự động cập nhật chưa được cấu hình backend trong phiên bản này. Vui lòng theo dõi các bản phát hành mới tại trang cá nhân tác giả.',
    btn_check_updates: 'Kiểm tra bản cập nhật mới',
    updates_disabled_btn: 'Chưa hỗ trợ cập nhật tự động',

    // About Tab
    about_tagline: 'Tiện ích desktop cá nhân xử lý thẻ siêu dữ liệu hàng loạt và giao diện chuẩn hóa âm lượng.',
    about_author: 'Tác giả: Bùi Việt Linh',
    about_repo_label: 'Trang tác giả:',
    about_repo_status: '(Kho mã nguồn chưa công bố chính thức)',
    about_summary_title: 'Tóm tắt công dụng thực tế',
    about_summary_text: 'VXmp3 hỗ trợ chỉnh sửa siêu dữ liệu hàng loạt cho các định dạng nhạc số phổ biến (MP3, FLAC, M4A, OGG, WAV). Module lõi đo độ lớn EBU R128 và cân bằng Lossless MP3Gain đang được hoàn thiện độc lập và chưa sử dụng được trong phiên bản này.',
    about_tech_title: 'Công nghệ nền tảng:',
    about_tech_1: 'Tauri v2 + Rust Core Engine',
    about_tech_2: 'React 19 + TypeScript + Virtualized Table',
    about_tech_3: 'Giao diện desktop đồng nhất',

    // Support Tab
    support_title: 'Ủng hộ tác giả một ly cà phê',
    support_thank_note: 'Nếu VXmp3 giúp bạn tiết kiệm thời gian và quản lý thư viện nhạc ưng ý hơn, hãy ủng hộ tác giả qua mã QR bên dưới nhé:',
    support_scan_hint: 'Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ để ủng hộ tác giả. Chân thành cảm ơn sự đồng hành của bạn!',

    // Footer
    btn_defaults: 'Khôi phục mặc định',
    btn_close: 'Đóng',
  },
  en: {
    // WindowBar & Menus
    app_title: 'VXmp3',
    menu_file: 'File',
    menu_edit: 'Edit',
    menu_view: 'View',
    menu_tools: 'Tools',
    menu_help: 'Help',
    open_folder: 'Open Folder...',
    save_tags: 'Save Tag Changes (Cmd/Ctrl+S)',
    settings: 'Settings...',
    close_window: 'Close Window',
    select_all: 'Select All (Cmd/Ctrl+A)',
    deselect_all: 'Deselect All (Esc)',
    view_all: 'All Columns',
    view_tags: 'Tag View',
    view_mp3gain: 'MP3Gain View',
    tool_analyze_disabled: 'Measure dB (Disabled - awaiting core engine)',
    tool_gain_disabled: '1-Click Normalize (Disabled - awaiting core engine)',
    tool_undo_disabled: 'Undo (Not supported)',
    about: 'About VXmp3',

    // Settings Modal
    settings_title: 'Settings',
    tab_general: 'General',
    tab_gain: 'Loudness & Gain',
    tab_shortcuts: 'Shortcuts',
    tab_updates: 'Updates',
    tab_about: 'About',
    tab_support: 'Support Author',

    // General Tab
    sec_theme: 'Appearance Theme',
    theme_system: 'System Adaptive',
    theme_dark: 'Dark (Slate Navy)',
    theme_light: 'Light',
    theme_black: 'OLED Black',
    sec_language: 'Interface Language',
    lang_vi: 'Tiếng Việt',
    lang_en: 'English',
    lang_scope_note: 'Note: Language applies to chrome and settings; audio metadata fields retain standard ID3 technical naming.',

    // Loudness & Gain Tab
    sec_target_db: 'Target Loudness Normalization',
    target_db_desc: 'Specify the target sound level for track normalization:',
    target_89_label: '89.0 dB SPL (ReplayGain Recommended)',
    target_89_desc: 'ReplayGain reference target; measurement and normalization are not yet supported.',
    target_96_label: '96.0 dB SPL (High Loudness)',
    target_96_desc: 'Suitable for car stereos or noisy playback environments.',
    sec_clipping: 'Clipping Protection',
    clipping_checkbox: 'Allow boosting gain despite True Peak exceeding 0.0 dBTP',
    clipping_disabled_note: '(Not supported in current core engine)',
    sec_autosave: 'Auto-save on edit',
    autosave_checkbox: 'Automatically write to disk upon exiting Inline Edit cell',
    autosave_disabled_note: '(Not supported - disabled to avoid I/O bottlenecks; use Cmd/Ctrl+S to save)',

    // Shortcuts Tab
    sec_shortcuts_title: 'Keyboard Shortcuts',
    sc_play_pause: 'Play / Pause track',
    sc_save_pending: 'Save all pending tag modifications',
    sc_select_all: 'Select all tracks in list',
    sc_inline_edit: 'Activate quick cell editing (Inline Edit)',
    sc_nav_vertical: 'Commit & move to lower / upper row',
    sc_nav_horizontal: 'Commit & move to right / left column',
    sc_cancel_edit: 'Cancel editing / Deselect all',

    // Updates Tab
    updates_title: 'Software Updates',
    updates_desc: 'Check for new releases and download updates from GitHub Releases.',
    updates_unsupported_notice: 'Automatic update system is not configured with a backend in this release. Please follow new releases on the author profile.',
    btn_check_updates: 'Check for Updates',
    updates_disabled_btn: 'Auto-update not supported',

    // About Tab
    about_tagline: 'Personal desktop utility for batch audio tagging and loudness normalization interface.',
    about_author: 'Author: Viet Linh Bui',
    about_repo_label: 'Author Profile:',
    about_repo_status: '(Repository not yet published publicly)',
    about_summary_title: 'Summary of Capabilities',
    about_summary_text: 'VXmp3 supports batch metadata editing for popular digital audio formats (MP3, FLAC, M4A, OGG, WAV). The EBU R128 loudness measurement core and Lossless MP3Gain engine are being developed independently to ensure file safety.',
    about_tech_title: 'Core Technologies:',
    about_tech_1: 'Tauri v2 + Rust Core Engine',
    about_tech_2: 'React 19 + TypeScript + Virtualized Table',
    about_tech_3: 'Shared desktop design tokens',

    // Support Tab
    support_title: 'Buy the author a coffee',
    support_thank_note: 'If VXmp3 helps you save time and manage your music library effortlessly, feel free to support the author via the QR code below:',
    support_scan_hint: 'Scan the VietQR code using any mobile banking app. Thank you for your support!',

    // Footer
    btn_defaults: 'Reset Defaults',
    btn_close: 'Close',
  },
};

export function t(lang: Language = 'vi') {
  return translations[lang] || translations.vi;
}
