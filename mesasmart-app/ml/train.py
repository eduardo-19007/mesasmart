"""Temporal regression experiment. Demonstration data never enables production ML."""
import argparse
import csv
import hashlib
import json
import math
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.ml-deps'))
import sklearn
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = ['baseline_minutes', 'quantity']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', type=Path)
    parser.add_argument('--demo', action='store_true')
    parser.add_argument('--output', type=Path, default=ROOT / 'ml/results/demo')
    args = parser.parse_args()
    if args.demo == bool(args.csv):
        parser.error('Choose exactly one of --demo or --csv')
    if args.demo:
        rng = random.Random(42851)
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        rows = []
        for i in range(240):
            base, quantity = rng.choice([5, 10, 15, 20, 25]), rng.randint(1, 8)
            rows.append(dict(created_at=(start + timedelta(hours=i)).isoformat(),
                             baseline_minutes=base, quantity=quantity,
                             actual_minutes=max(1, base + 1.6 * quantity + rng.gauss(0, 3))))
    else:
        with args.csv.open(encoding='utf-8-sig', newline='') as stream:
            rows = list(csv.DictReader(stream))
    for row in rows:
        row['_time'] = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')).timestamp()
        for key in FEATURES + ['actual_minutes']:
            row[key] = float(row[key])
            if not math.isfinite(row[key]) or row[key] <= 0:
                raise ValueError(f'Invalid positive finite value for {key}')
    rows.sort(key=lambda row: row['_time'])
    if len(rows) < 60:
        raise ValueError(f'Only {len(rows)} records; at least 60 required by this experiment, not by the syllabus.')
    # Keep identical timestamps together to avoid crossing temporal boundaries.
    times = sorted({row['_time'] for row in rows})
    if len(times) < 10:
        raise ValueError('Insufficient distinct timestamps')
    cut1, cut2 = times[int(len(times) * .6)], times[int(len(times) * .8)]
    groups = [[r for r in rows if r['_time'] < cut1],
              [r for r in rows if cut1 <= r['_time'] < cut2],
              [r for r in rows if r['_time'] >= cut2]]
    def xy(group):
        return [[r[f] for f in FEATURES] for r in group], [r['actual_minutes'] for r in group]
    xtrain, ytrain = xy(groups[0])
    xval, yval = xy(groups[1])
    xtest, ytest = xy(groups[2])
    candidates = []
    for alpha in [0.1, 1.0, 10.0]:
        model = make_pipeline(StandardScaler(), Ridge(alpha=alpha))
        model.fit(xtrain, ytrain)
        candidates.append((mean_absolute_error(yval, model.predict(xval)), alpha, model))
    _, alpha, model = min(candidates, key=lambda item: item[0])
    predictions = [max(1, float(v)) for v in model.predict(xtest)]
    baseline = [r['baseline_minutes'] for r in groups[2]]
    scaler, ridge = model.steps[0][1], model.steps[1][1]
    artifact = dict(features=FEATURES, means=scaler.mean_.tolist(), scales=scaler.scale_.tolist(),
                    coefficients=ridge.coef_.tolist(), intercept=float(ridge.intercept_))
    # Verify the portable inference artifact matches sklearn including clipping.
    portable = [max(1, artifact['intercept'] + sum((v-m)/s*c for v,m,s,c in
                zip(row,artifact['means'],artifact['scales'],artifact['coefficients']))) for row in xtest]
    assert max(abs(a-b) for a,b in zip(portable,predictions)) < 1e-8
    report = dict(provenance='SYNTHETIC_DEMONSTRATION' if args.demo else 'LOCAL_EXPORT_REQUIRES_PROVENANCE_REVIEW',
                  generated_at=datetime.now(timezone.utc).isoformat(), sklearn=sklearn.__version__,
                  production_approved=False, target='minutes from confirmed_at to ready_at',
                  features=FEATURES, counts=dict(zip(['train','validation','test'], map(len,groups))),
                  alpha=alpha, validation_mae=[{'alpha':a,'mae':float(m)} for m,a,_ in candidates],
                  test_mae=float(mean_absolute_error(ytest,predictions)),
                  test_rmse=float(mean_squared_error(ytest,predictions)**.5),
                  baseline_test_mae=float(mean_absolute_error(ytest,baseline)),
                  dataset_sha256=hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),
                  limitations=['No causal impact estimate', 'No restaurant pilot established',
                               'No queue-load feature; external validity unproven',
                               'Current runtime retains the configured baseline'])
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output/'model.json').write_text(json.dumps(artifact,indent=2),encoding='utf-8')
    (args.output/'metrics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    with (args.output/'predictions.csv').open('w',newline='',encoding='utf-8') as stream:
        writer=csv.writer(stream)
        writer.writerow(['created_at','actual_minutes','baseline_minutes','predicted_minutes'])
        writer.writerows((r['created_at'],r['actual_minutes'],r['baseline_minutes'],p) for r,p in zip(groups[2],predictions))
    print(json.dumps(report,indent=2))


if __name__ == '__main__':
    main()
