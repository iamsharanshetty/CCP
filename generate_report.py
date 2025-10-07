import csv
import os
import glob
import time

def generate_report():
    """Reads Locust CSV output and generates a clean report."""
    
    # Find the latest stats file created by Locust
    list_of_files = glob.glob('final_load_test_report_stats.csv')
    if not list_of_files:
        print(f"Error: No stats file found. Please run the load test again.")
        return
    
    report_file = max(list_of_files, key=os.path.getmtime)
    
    failures_file = report_file.replace('_stats.csv', '_stats_failures.csv')
    summary_file = report_file.replace('_stats.csv', '_summary.txt')

    stats = {}
    with open(report_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['Name'] == 'Aggregated':
                stats = row
                break

    # Check for failures
    failure_count = 0
    if os.path.exists(failures_file):
        with open(failures_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                failure_count += int(row['Occurrences'])

    # Write the summary report to a file
    with open(summary_file, 'w') as f:
        f.write(f"--- Load Test Summary Report ({os.path.basename(report_file)}) ---\n\n")
        
        current_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(report_file)))
        f.write(f"Timestamp: {current_time}\n")
        
        f.write(f"Total Users Simulated: {stats.get('User Count')}\n")
        f.write("----------------------------------------\n\n")

        # Performance Metrics
        f.write("## Performance Metrics\n")
        f.write(f"Requests per second (RPS): {float(stats.get('Requests/s', 0)):.2f}\n")
        f.write(f"Total Requests: {stats.get('Total Request Count')}\n")
        f.write(f"Average Response Time: {float(stats.get('Total Average Response Time', 0)):.2f} ms\n")
        f.write(f"Median Response Time (50%): {stats.get('50%', 'N/A')} ms\n")
        f.write(f"95th Percentile Response Time: {stats.get('95%', 'N/A')} ms\n")
        f.write(f"Max Response Time: {stats.get('100%', 'N/A')} ms\n\n")

        # Error Metrics
        f.write("## Error Metrics\n")
        failure_rate = (failure_count / float(stats.get('Total Request Count', 1))) * 100 if stats.get('Total Request Count') else 0
        f.write(f"Total Failures: {failure_count}\n")
        f.write(f"Failure Rate: {failure_rate:.2f}%\n")
        f.write(f"Failures per second: {float(stats.get('Failures/s', 0)):.2f}\n\n")

        # Verdict
        f.write("## Overall Verdict\n")
        if failure_rate > 0:
            f.write("Status: BAD\n")
            f.write("Reason: The application experienced a high failure rate. This indicates a critical issue under load, likely due to a crash or a non-2xx response from the server.\n")
        elif float(stats.get('95%', '0')) > 1000:
            f.write("Status: WARNING\n")
            f.write("Reason: The application has high latency under load. The 95th percentile response time is over 1000ms, which may lead to a poor user experience.\n")
        else:
            f.write("Status: GOOD\n")
            f.write("Reason: The application handled the simulated load without any failures and with acceptable response times.\n")

    print(f"Report generated successfully: {summary_file}")

if __name__ == "__main__":
    generate_report()