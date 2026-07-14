import 'package:flutter/material.dart';
import '../theme.dart';

class ComposerWidget extends StatefulWidget {
  final String channelName;
  final Future<void> Function(String) onSend;
  final void Function(bool) onTyping;

  const ComposerWidget({
    super.key,
    required this.channelName,
    required this.onSend,
    required this.onTyping,
  });

  @override
  State<ComposerWidget> createState() => _ComposerWidgetState();
}

class _ComposerWidgetState extends State<ComposerWidget> {
  final _ctrl = TextEditingController();
  bool _sending = false;

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _ctrl.clear();
    widget.onTyping(false);
    try {
      await widget.onSend(text);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
    if (mounted) setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 12, right: 8, top: 8,
        bottom: MediaQuery.of(context).padding.bottom + 8,
      ),
      decoration: const BoxDecoration(
        color: AppColors.panel,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: _ctrl,
              maxLines: 4,
              minLines: 1,
              style: const TextStyle(color: AppColors.text),
              onChanged: (v) => widget.onTyping(v.isNotEmpty),
              decoration: InputDecoration(
                hintText: 'Message #${widget.channelName}',
                hintStyle: const TextStyle(color: AppColors.textMute),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
          ),
          Material(
            color: _ctrl.text.trim().isEmpty ? AppColors.panel2 : AppColors.emerald,
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: _send,
              child: Container(
                width: 40, height: 40,
                alignment: Alignment.center,
                child: _sending
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send, color: Colors.white, size: 18),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
