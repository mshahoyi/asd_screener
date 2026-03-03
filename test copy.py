

# %%
import pandas as pd
import numpy as np

pd.set_option("display.max_colwidth", None)
pd.set_option("display.max_rows", None)
pd.set_option("display.max_columns", None)

# %%
from pandas import json_normalize

# Load and prepare the data
df = pd.read_json("gameEvents.json")
properties_df = json_normalize(df['properties'])
df = df.drop('properties', axis=1).join(properties_df, lsuffix='_original', rsuffix='_properties')

# Convert timestamp to datetime for easier calculations
df['timestamp'] = pd.to_datetime(df['timestamp_original'])

print("Original data shape:", df.shape)
print("Original data preview:")
print(df.head())

# %%
# Only keep the game ids mentioned above and add is_asd column

asd_game_ids = [2, 47, 59, 60, 83, 84, 86, 88, 89, 90, 91, 92, 101, 103, 104, 147, 148, 150, 152, 153, 154, 155, 157, 158]
td_game_ids = [18, 19, 20, 21, 23, 24, 25, 43, 46, 55, 61]
all_game_ids = asd_game_ids + td_game_ids

# Filter the dataframe to only keep the specified gameIds
df = df[df['gameId'].isin(all_game_ids)].copy()

# Add is_asd column: True for ASD gameIds, False otherwise
df['is_asd'] = df['gameId'].isin(asd_game_ids)

print("Filtered data shape:", df.shape)
print("ASD/TD distribution:")
print(df.groupby('is_asd')['gameId'].nunique())

# %%
def calculate_average_dragging_speed_per_game(df):
    """
    Calculate average dragging speed for each game ID.
    
    Speed is calculated as the distance moved between consecutive drag events
    divided by the time elapsed between those events.
    
    Parameters:
    df (pd.DataFrame): DataFrame containing drag events with columns:
        - gameId: Game identifier
        - name: Event name (pan_handler_begin, pan_handler_update, pan_handler_end)
        - timestamp: Event timestamp
        - absoluteX, absoluteY: Absolute position coordinates
        - handlerTag: To group drag sequences
    
    Returns:
    pd.DataFrame: DataFrame with gameId and average_drag_speed columns
    """
    
    # Filter for drag events only
    drag_events = df[df['name'].isin(['pan_handler_begin', 'pan_handler_update', 'pan_handler_end'])].copy()
    
    if drag_events.empty:
        return pd.DataFrame(columns=['gameId', 'average_drag_speed'])
    
    # Sort by gameId, handlerTag, and timestamp to ensure proper ordering
    drag_events = drag_events.sort_values(['gameId', 'handlerTag', 'timestamp']).reset_index(drop=True)
    
    # Calculate speeds for each drag sequence
    speeds_list = []
    
    # Group by gameId and handlerTag to handle separate drag sequences
    for (game_id, handler_tag), group in drag_events.groupby(['gameId', 'handlerTag']):
        if len(group) < 2:
            continue  # Need at least 2 points to calculate speed
    
        is_asd = game_id in asd_game_ids
        group = group.reset_index(drop=True)
        
        # Calculate speed between consecutive points
        for i in range(1, len(group)):
            prev_row = group.iloc[i-1]
            curr_row = group.iloc[i]
            
            # Calculate distance moved
            dx = curr_row['absoluteX'] - prev_row['absoluteX']
            dy = curr_row['absoluteY'] - prev_row['absoluteY']
            distance = np.sqrt(dx**2 + dy**2)
            
            # Calculate time difference (in seconds)
            time_diff = (curr_row['timestamp'] - prev_row['timestamp']).total_seconds()
            
            # Avoid division by zero
            if time_diff > 0:
                speed = distance / time_diff  # pixels per second
                speeds_list.append({
                    'gameId': game_id,
                    'is_asd': is_asd,
                    'speed': speed,
                    'handler_tag': handler_tag
                })
    
    if not speeds_list:
        return pd.DataFrame(columns=['gameId', 'average_drag_speed'])
    
    # Convert to DataFrame and calculate average speed per game
    speeds_df = pd.DataFrame(speeds_list)
    avg_speeds = speeds_df.groupby('gameId')['speed'].mean().reset_index()
    avg_speeds.columns = ['gameId', 'average_drag_speed']
    
    return avg_speeds


def calculate_average_distance_per_game(df):
    """
    Calculate average total distance traveled per game ID.
    
    Distance is calculated as the total distance traveled during each drag sequence,
    then averaged across all drag sequences for each game.
    
    Parameters:
    df (pd.DataFrame): DataFrame containing drag events with columns:
        - gameId: Game identifier
        - name: Event name (pan_handler_begin, pan_handler_update, pan_handler_end)
        - timestamp: Event timestamp
        - absoluteX, absoluteY: Absolute position coordinates
        - handlerTag: To group drag sequences
    
    Returns:
    pd.DataFrame: DataFrame with gameId and average_distance columns
    """
    
    # Filter for drag events only
    drag_events = df[df['name'].isin(['pan_handler_begin', 'pan_handler_update', 'pan_handler_end'])].copy()
    
    if drag_events.empty:
        return pd.DataFrame(columns=['gameId', 'average_distance'])
    
    # Sort by gameId, handlerTag, and timestamp to ensure proper ordering
    drag_events = drag_events.sort_values(['gameId', 'handlerTag', 'timestamp']).reset_index(drop=True)
    
    # Calculate total distance for each drag sequence
    distances_list = []
    
    # Group by gameId and handlerTag to handle separate drag sequences
    for (game_id, handler_tag), group in drag_events.groupby(['gameId', 'handlerTag']):
        if len(group) < 2:
            continue  # Need at least 2 points to calculate distance
        
        is_asd = game_id in asd_game_ids
        group = group.reset_index(drop=True)
        
        # Calculate total distance for this drag sequence
        total_distance = 0
        
        for i in range(1, len(group)):
            prev_row = group.iloc[i-1]
            curr_row = group.iloc[i]
            
            # Calculate distance moved between consecutive points
            dx = curr_row['absoluteX'] - prev_row['absoluteX']
            dy = curr_row['absoluteY'] - prev_row['absoluteY']
            distance = np.sqrt(dx**2 + dy**2)
            total_distance += distance
        
        distances_list.append({
            'gameId': game_id,
            'is_asd': is_asd,
            'total_distance': total_distance,
            'handler_tag': handler_tag
        })
    
    if not distances_list:
        return pd.DataFrame(columns=['gameId', 'average_distance'])
    
    # Convert to DataFrame and calculate average distance per game
    distances_df = pd.DataFrame(distances_list)
    avg_distances = distances_df.groupby('gameId')['total_distance'].mean().reset_index()
    avg_distances.columns = ['gameId', 'average_distance']
    
    return avg_distances


def create_test_drag_data():
    """
    Create a test DataFrame with sample drag events to test the speed calculation function.
    """
    test_data = []
    
    # Game 1: Simple horizontal drag
    base_time = pd.Timestamp('2025-01-01 10:00:00')
    
    # Drag sequence 1 for game 1
    test_data.extend([
        {
            'gameId': 1,
            'name': 'pan_handler_begin',
            'timestamp': base_time,
            'absoluteX': 100,
            'absoluteY': 200,
            'handlerTag': 1
        },
        {
            'gameId': 1,
            'name': 'pan_handler_update',
            'timestamp': base_time + pd.Timedelta(milliseconds=100),
            'absoluteX': 150,
            'absoluteY': 200,
            'handlerTag': 1
        },
        {
            'gameId': 1,
            'name': 'pan_handler_update',
            'timestamp': base_time + pd.Timedelta(milliseconds=200),
            'absoluteX': 200,
            'absoluteY': 200,
            'handlerTag': 1
        },
        {
            'gameId': 1,
            'name': 'pan_handler_end',
            'timestamp': base_time + pd.Timedelta(milliseconds=300),
            'absoluteX': 250,
            'absoluteY': 200,
            'handlerTag': 1
        }
    ])
    
    # Game 2: Diagonal drag with different speed
    test_data.extend([
        {
            'gameId': 2,
            'name': 'pan_handler_begin',
            'timestamp': base_time + pd.Timedelta(seconds=1),
            'absoluteX': 0,
            'absoluteY': 0,
            'handlerTag': 2
        },
        {
            'gameId': 2,
            'name': 'pan_handler_update',
            'timestamp': base_time + pd.Timedelta(seconds=1, milliseconds=500),
            'absoluteX': 30,
            'absoluteY': 40,
            'handlerTag': 2
        },
        {
            'gameId': 2,
            'name': 'pan_handler_end',
            'timestamp': base_time + pd.Timedelta(seconds=2),
            'absoluteX': 60,
            'absoluteY': 80,
            'handlerTag': 2
        }
    ])
    
    # Game 1: Second drag sequence (to test multiple drags per game)
    test_data.extend([
        {
            'gameId': 1,
            'name': 'pan_handler_begin',
            'timestamp': base_time + pd.Timedelta(seconds=3),
            'absoluteX': 300,
            'absoluteY': 300,
            'handlerTag': 3
        },
        {
            'gameId': 1,
            'name': 'pan_handler_update',
            'timestamp': base_time + pd.Timedelta(seconds=3, milliseconds=250),
            'absoluteX': 350,
            'absoluteY': 350,
            'handlerTag': 3
        },
        {
            'gameId': 1,
            'name': 'pan_handler_end',
            'timestamp': base_time + pd.Timedelta(seconds=3, milliseconds=500),
            'absoluteX': 400,
            'absoluteY': 400,
            'handlerTag': 3
        }
    ])
    
    # Add some non-drag events to ensure they're filtered out
    test_data.extend([
        {
            'gameId': 1,
            'name': 'touch_start',
            'timestamp': base_time + pd.Timedelta(seconds=4),
            'absoluteX': 500,
            'absoluteY': 500,
            'handlerTag': 4
        },
        {
            'gameId': 2,
            'name': 'game_screen_mount',
            'timestamp': base_time + pd.Timedelta(seconds=5),
            'absoluteX': 600,
            'absoluteY': 600,
            'handlerTag': 5
        }
    ])
    
    return pd.DataFrame(test_data)


# %%
# Test the function
print("Creating test data...")
test_df = create_test_drag_data()
print("\nTest data shape:", test_df.shape)
print("\nTest data preview:")
print(test_df[test_df['name'].str.contains('pan_handler')])

print("\n" + "="*50)
print("TESTING DRAG SPEED CALCULATION")
print("="*50)

# Calculate speeds
result = calculate_average_dragging_speed_per_game(test_df)
print("\nCalculated average dragging speeds:")
print(result)

# Let's manually verify the calculations
print("\n" + "="*50)
print("MANUAL VERIFICATION")
print("="*50)

# Game 1, first drag sequence (handlerTag 1):
# Point 1: (100, 200) at 0ms
# Point 2: (150, 200) at 100ms -> distance = 50, time = 0.1s -> speed = 500 px/s
# Point 3: (200, 200) at 200ms -> distance = 50, time = 0.1s -> speed = 500 px/s  
# Point 4: (250, 200) at 300ms -> distance = 50, time = 0.1s -> speed = 500 px/s
print("Game 1, first drag sequence expected speed: 500 px/s")

# Game 1, second drag sequence (handlerTag 3):
# Point 1: (300, 300) at 3000ms
# Point 2: (350, 350) at 3250ms -> distance = sqrt(50^2 + 50^2) ≈ 70.71, time = 0.25s -> speed ≈ 282.84 px/s
# Point 3: (400, 400) at 3500ms -> distance = sqrt(50^2 + 50^2) ≈ 70.71, time = 0.25s -> speed ≈ 282.84 px/s
print("Game 1, second drag sequence expected speed: ~282.84 px/s")
print("Game 1 average expected: (500 + 500 + 500 + 282.84 + 282.84) / 5 ≈ 413.14 px/s")

# Game 2 (handlerTag 2):
# Point 1: (0, 0) at 1000ms
# Point 2: (30, 40) at 1500ms -> distance = sqrt(30^2 + 40^2) = 50, time = 0.5s -> speed = 100 px/s
# Point 3: (60, 80) at 2000ms -> distance = sqrt(30^2 + 40^2) = 50, time = 0.5s -> speed = 100 px/s
print("Game 2 expected speed: 100 px/s")

# %%
# Test the distance function
print("\n" + "="*50)
print("TESTING DISTANCE CALCULATION")
print("="*50)

# Calculate distances
distance_result = calculate_average_distance_per_game(test_df)
print("\nCalculated average distances:")
print(distance_result)

# Manual verification for distances
print("\n" + "="*50)
print("DISTANCE MANUAL VERIFICATION")
print("="*50)

# Game 1, first drag sequence (handlerTag 1):
# Point 1: (100, 200) -> Point 2: (150, 200) -> distance = 50
# Point 2: (150, 200) -> Point 3: (200, 200) -> distance = 50  
# Point 3: (200, 200) -> Point 4: (250, 200) -> distance = 50
# Total distance = 150 pixels
print("Game 1, first drag sequence expected total distance: 150 pixels")

# Game 1, second drag sequence (handlerTag 3):
# Point 1: (300, 300) -> Point 2: (350, 350) -> distance = sqrt(50^2 + 50^2) ≈ 70.71
# Point 2: (350, 350) -> Point 3: (400, 400) -> distance = sqrt(50^2 + 50^2) ≈ 70.71
# Total distance ≈ 141.42 pixels
print("Game 1, second drag sequence expected total distance: ~141.42 pixels")
print("Game 1 average expected: (150 + 141.42) / 2 ≈ 145.71 pixels")

# Game 2 (handlerTag 2):
# Point 1: (0, 0) -> Point 2: (30, 40) -> distance = sqrt(30^2 + 40^2) = 50
# Point 2: (30, 40) -> Point 3: (60, 80) -> distance = sqrt(30^2 + 40^2) = 50
# Total distance = 100 pixels
print("Game 2 expected total distance: 100 pixels")

# %%
# Now apply the function to your actual data
print("\n" + "="*50)
print("APPLYING TO ACTUAL DATA")
print("="*50)

# Apply the functions to your filtered dataframe
actual_speeds = calculate_average_dragging_speed_per_game(df)
actual_distances = calculate_average_distance_per_game(df)

print("\nAverage dragging speeds per game ID:")
print(actual_speeds)

print("\nAverage distances per game ID:")
print(actual_distances)

# Sort by speed to see fastest and slowest
print("\nSorted by speed (fastest to slowest):")
print(actual_speeds.sort_values('average_drag_speed', ascending=False))

# Sort by distance to see longest and shortest
print("\nSorted by distance (longest to shortest):")
print(actual_distances.sort_values('average_distance', ascending=False))

# Combine speed and distance data
combined_results = actual_speeds.merge(actual_distances, on='gameId', how='outer')

# Add ASD/TD information to the results
combined_results['is_asd'] = combined_results['gameId'].isin(asd_game_ids)
combined_results['group'] = combined_results['is_asd'].map({True: 'ASD', False: 'TD'})

print("\nCombined results with ASD/TD grouping:")
print(combined_results[['gameId', 'average_drag_speed', 'average_distance', 'group']])

# Compare average speeds between ASD and TD groups
print("\nAverage speeds by group:")
speed_group_stats = combined_results.groupby('group')['average_drag_speed'].agg(['mean', 'std', 'count'])
print(speed_group_stats)

# Compare average distances between ASD and TD groups
print("\nAverage distances by group:")
distance_group_stats = combined_results.groupby('group')['average_distance'].agg(['mean', 'std', 'count'])
print(distance_group_stats)

# %%
# Save both speed and distance results
actual_speeds.to_csv("average_dragging_speeds_per_game.csv", index=False)
actual_distances.to_csv("average_dragging_distances_per_game.csv", index=False)
combined_results.to_csv("combined_drag_metrics_per_game.csv", index=False)

print("\nSaved results to CSV files:")
print("- average_dragging_speeds_per_game.csv")
print("- average_dragging_distances_per_game.csv") 
print("- combined_drag_metrics_per_game.csv")

# %%
combined_results