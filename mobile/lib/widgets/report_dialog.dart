import 'package:flutter/material.dart';

const _reasons = <String, String>{
  'incorrect-answer': 'Wrong answer marked correct',
  'unclear': 'Question or options unclear',
  'typo': 'Typo or formatting issue',
  'outdated': 'Outdated information',
  'duplicate': 'Duplicate of another question',
  'other': 'Other',
};

Future<({String reason, String? detail})?> showReportDialog(BuildContext context) {
  return showDialog<({String reason, String? detail})>(
    context: context,
    builder: (_) => const _ReportDialog(),
  );
}

class _ReportDialog extends StatefulWidget {
  const _ReportDialog();
  @override
  State<_ReportDialog> createState() => _ReportDialogState();
}

class _ReportDialogState extends State<_ReportDialog> {
  String _reason = 'incorrect-answer';
  final _detail = TextEditingController();

  @override
  void dispose() {
    _detail.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Report this question'),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          ..._reasons.entries.map((e) => RadioListTile<String>(
                value: e.key,
                groupValue: _reason,
                onChanged: (v) => setState(() => _reason = v!),
                title: Text(e.value, style: const TextStyle(fontSize: 14)),
                contentPadding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              )),
          const SizedBox(height: 8),
          TextField(
            controller: _detail,
            maxLines: 3,
            maxLength: 1000,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Add details (optional)',
            ),
          ),
        ]),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () {
            final detail = _detail.text.trim();
            Navigator.pop(context, (reason: _reason, detail: detail.isEmpty ? null : detail));
          },
          child: const Text('Send'),
        ),
      ],
    );
  }
}
